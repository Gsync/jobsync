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

vi.mock("@/lib/scraper/lever", () => ({
  searchLeverJobs: vi.fn(),
}));

vi.mock("@/lib/scraper/jsearch", () => ({
  searchJSearchJobs: vi.fn(),
}));

vi.mock("@/lib/api-key-resolver", () => ({
  resolveApiKey: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/provider-registry.server", () => ({
  PROVIDER_VERIFIERS: { ollama: vi.fn().mockResolvedValue({ success: true }) },
}));

vi.mock("ai", () => ({ generateText: vi.fn() }));

vi.mock("@/lib/ai", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, getModel: vi.fn().mockResolvedValue({}) };
});

import { runAutomation } from "@/lib/scraper/runner";
import { searchGreenhouseJobs } from "@/lib/scraper/greenhouse";
import { searchLeverJobs } from "@/lib/scraper/lever";
import { generateText } from "ai";
import type { Automation } from "@/models/automation.model";

function makeJob(title: string, description = "", extra = {}) {
  return {
    title,
    company: "Acme",
    location: "Remote",
    description,
    url: `https://jobs.lever.co/acme/${Math.random()}`,
    postedDate: "2026-06-01T00:00:00Z",
    ...extra,
  };
}

const leverAutomation: Automation = {
  id: "auto-lever",
  userId: "user1",
  name: "Lever",
  jobBoard: "lever",
  keywords: "",
  location: "",
  sourceConfig: JSON.stringify({
    lever: {
      companies: [{ name: "Acme", token: "acme", host: "eu" }],
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

describe("runAutomation (lever)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.automationRun.create as any).mockResolvedValue({ id: "run1" });
    (prisma.automationRun.update as any).mockResolvedValue({
      id: "run1",
      automationId: "auto-lever",
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
    (prisma.job.findMany as any).mockResolvedValue([]);
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

  it("dispatches to the Lever provider (reads the lever config key), not Greenhouse", async () => {
    (searchLeverJobs as any).mockResolvedValue({
      jobs: [makeJob("Frontend Engineer", "React")],
      errors: [],
    });

    const result = await runAutomation(leverAutomation);

    expect(result.status).toBe("completed");
    expect((searchLeverJobs as any).mock.calls.length).toBe(1);
    expect((searchGreenhouseJobs as any).mock.calls.length).toBe(0);
    // The lever config's companies (with host) are passed through.
    expect((searchLeverJobs as any).mock.calls[0][0]).toEqual([
      { name: "Acme", token: "acme", host: "eu" },
    ]);
    expect(result.jobsSaved).toBe(1);
  });

  it("persists Lever's workplaceType through to the job record", async () => {
    (searchLeverJobs as any).mockResolvedValue({
      jobs: [makeJob("Frontend Engineer", "React", { workplaceType: "HYBRID" })],
      errors: [],
    });

    await runAutomation(leverAutomation);

    const createArg = (prisma.job.create as any).mock.calls[0][0];
    expect(createArg.data.workplaceType).toBe("HYBRID");
  });

  it("fails cleanly with no_companies when the lever config is empty", async () => {
    const auto = {
      ...leverAutomation,
      sourceConfig: JSON.stringify({ lever: { companies: [] } }),
    };

    const result = await runAutomation(auto);
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("no_companies");
    expect((searchLeverJobs as any).mock.calls.length).toBe(0);
  });
});
