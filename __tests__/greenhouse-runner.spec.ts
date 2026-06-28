import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const m = {
    automationRun: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    automation: { findUnique: vi.fn(), update: vi.fn() },
    resume: { findUnique: vi.fn() },
    userSettings: { findUnique: vi.fn() },
    job: { findMany: vi.fn(), create: vi.fn() },
    jobTitle: { findFirst: vi.fn(), create: vi.fn() },
    location: { findFirst: vi.fn(), create: vi.fn() },
    company: { findFirst: vi.fn(), create: vi.fn() },
    jobSource: { findFirst: vi.fn(), create: vi.fn() },
    jobStatus: { findFirst: vi.fn(), create: vi.fn() },
  };
  return {
    PrismaClient: vi.fn(function () {
      return m;
    }),
  };
});

vi.mock("@/lib/scraper/greenhouse", () => ({
  searchGreenhouseJobs: vi.fn(),
}));

vi.mock("ai", () => ({ generateText: vi.fn() }));

vi.mock("@/lib/ai", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, getModel: vi.fn().mockResolvedValue({}) };
});

import { runAutomation } from "@/lib/scraper/runner";
import { searchGreenhouseJobs } from "@/lib/scraper/greenhouse";
import { generateText } from "ai";
import type { Automation } from "@/models/automation.model";

function makeJob(title: string, description = "") {
  return {
    title,
    company: "Acme",
    location: "Remote",
    description,
    url: `https://job-boards.greenhouse.io/acme/jobs/${Math.random()}`,
    postedDate: "2026-06-01T00:00:00Z",
  };
}

const automation: Automation = {
  id: "auto1",
  userId: "user1",
  name: "GH",
  jobBoard: "greenhouse",
  keywords: "",
  location: "",
  sourceConfig: JSON.stringify({
    greenhouse: {
      companies: [
        { name: "Acme", token: "acme" },
        { name: "Bad", token: "bad" },
      ],
      targetTitles: ["Frontend Engineer"],
      keywords: [],
      locations: [],
      strictLocation: false,
    },
  }),
  resumeId: "resume1",
  matchThreshold: 80,
  scheduleHour: 8,
  nextRunAt: null,
  lastRunAt: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("runAutomation (greenhouse)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.automationRun.create as any).mockResolvedValue({ id: "run1" });
    (prisma.automationRun.update as any).mockResolvedValue({
      id: "run1",
      automationId: "auto1",
    });
    (prisma.automation.findUnique as any).mockResolvedValue({ scheduleHour: 8 });
    (prisma.automation.update as any).mockResolvedValue({});
    (prisma.userSettings.findUnique as any).mockResolvedValue(null);
    (prisma.resume.findUnique as any).mockResolvedValue({
      id: "resume1",
      title: "My Resume",
      ContactInfo: null,
      ResumeSections: [],
    });
    (prisma.job.findMany as any).mockResolvedValue([]); // no existing urls
    (prisma.job.create as any).mockResolvedValue({});
    (prisma.jobTitle.findFirst as any).mockResolvedValue({ id: "jt" });
    (prisma.location.findFirst as any).mockResolvedValue({ id: "loc" });
    (prisma.company.findFirst as any).mockResolvedValue({ id: "co" });
    (prisma.jobSource.findFirst as any).mockResolvedValue({ id: "src" });
    (prisma.jobStatus.findFirst as any).mockResolvedValue({ id: "st" });

    (generateText as any).mockResolvedValue({
      text: "SCORES: match=90 recommendation=strong match\n\n## Summary\nGreat fit",
    });
  });

  it("saves only floor-passers, LLM-matches them, writes funnelStats", async () => {
    (searchGreenhouseJobs as any).mockResolvedValue({
      jobs: [
        makeJob("Frontend Engineer", "React"), // title hit -> passes
        makeJob("Senior Frontend Engineer", "Vue"), // title hit -> passes
        makeJob("Chef", "cook food"), // no signal -> dropped
        makeJob("Janitor", "clean"), // no signal -> dropped
      ],
      errors: [{ token: "bad", reason: "returned 404" }],
    });

    const result = await runAutomation(automation);

    expect(result.status).toBe("completed");
    // Only the 2 floor-passers saved.
    expect((prisma.job.create as any).mock.calls).toHaveLength(2);
    // LLM called once per floor-passer (<= K).
    expect((generateText as any).mock.calls.length).toBe(2);

    expect(result.jobsSearched).toBe(4);
    expect(result.jobsSaved).toBe(2);
    expect(result.jobsProcessed).toBe(2); // analyzed
    expect(result.jobsMatched).toBe(2); // highlighted (90 >= 80)

    const updateArg = (prisma.automationRun.update as any).mock.calls.find(
      (c: any[]) => c[0]?.where?.id === "run1",
    );
    const funnelStats = JSON.parse(updateArg[0].data.funnelStats);
    const byKey = Object.fromEntries(
      funnelStats.map((s: any) => [s.key, s.count]),
    );
    expect(byKey.fetched).toBe(4);
    expect(byKey.dedup).toBe(4);
    expect(byKey.floor).toBe(2);
    expect(byKey.analyzed).toBe(2);
    expect(byKey.highlighted).toBe(2);
    // located stage omitted (strictLocation off).
    expect(funnelStats.some((s: any) => s.key === "located")).toBe(false);
  });

  it("completes with zero saved when nothing clears the floor", async () => {
    (searchGreenhouseJobs as any).mockResolvedValue({
      jobs: [makeJob("Chef"), makeJob("Janitor")],
      errors: [],
    });

    const result = await runAutomation(automation);
    expect(result.status).toBe("completed");
    expect(result.jobsSaved).toBe(0);
    expect((generateText as any).mock.calls.length).toBe(0);
  });
});
