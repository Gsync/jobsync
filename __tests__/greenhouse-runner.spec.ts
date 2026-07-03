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

vi.mock("@/lib/scraper/jsearch", () => ({
  searchJSearchJobs: vi.fn(),
}));

vi.mock("@/lib/api-key-resolver", () => ({
  resolveApiKey: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("ai", () => ({ generateText: vi.fn() }));

vi.mock("@/lib/ai", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, getModel: vi.fn().mockResolvedValue({}) };
});

import { runAutomation } from "@/lib/scraper/runner";
import { searchGreenhouseJobs } from "@/lib/scraper/greenhouse";
import { searchJSearchJobs } from "@/lib/scraper/jsearch";
import { generateText } from "ai";
import type { Automation } from "@/models/automation.model";
import { AiProvider } from "@/models/ai.model";

// Each call to generateText returns a promise you resolve/reject manually,
// in whatever order the test wants — lets you simulate out-of-order
// completion and "already in-flight when X happens" scenarios.
function deferredGenerateTextQueue() {
  const pending: {
    resolve: (v: unknown) => void;
    reject: (e: unknown) => void;
  }[] = [];
  (generateText as any).mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
      }),
  );
  return pending; // pending[i] corresponds to the i-th generateText() call, in call order
}

function scoreText(score: number) {
  return `SCORES: match=${score} recommendation=strong\n\n## Summary\nGreat fit`;
}

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

  // Exercises getExistingJobKeys' wiring of real DB row shape (JobTitle/
  // Company/Location relations) into jobDedupeKey, not just the pure
  // dedupeJobs unit tested in scraper-utils.spec.ts.
  it("dedupes against an existing DB job whose URL differs only by www/trailing-slash/tracking-param", async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([
      {
        jobUrl: "https://www.job-boards.greenhouse.io/acme/jobs/1/?gh_src=abc",
        JobTitle: { label: "Frontend Engineer" },
        Company: { label: "Acme" },
        Location: { label: "Remote" },
      },
    ]);

    (searchGreenhouseJobs as any).mockResolvedValue({
      jobs: [
        {
          ...makeJob("Frontend Engineer", "React"),
          url: "https://job-boards.greenhouse.io/acme/jobs/1",
        },
        makeJob("Senior Frontend Engineer", "Vue"),
      ],
      errors: [],
    });

    const result = await runAutomation(automation);

    expect(result.status).toBe("completed");
    expect(result.jobsSearched).toBe(2);
    // The first job matches the existing DB row's normalized key, so only
    // the second (genuinely new) job is saved.
    expect(result.jobsSaved).toBe(1);
    expect((prisma.job.create as any).mock.calls).toHaveLength(1);

    const updateArg = (prisma.automationRun.update as any).mock.calls.find(
      (c: any[]) => c[0]?.where?.id === "run1",
    );
    const funnelStats = JSON.parse(updateArg[0].data.funnelStats);
    const byKey = Object.fromEntries(
      funnelStats.map((s: any) => [s.key, s.count]),
    );
    expect(byKey.fetched).toBe(2);
    expect(byKey.dedup).toBe(1);
  });

  // Concurrency semantics (bounded p-limit dispatch, provider-gated).
  // Ollama forces concurrency 1 (see beforeEach's default userSettings mock
  // of null -> defaultUserSettings.ai, which is Ollama), so these tests
  // override userSettings to a hosted provider to exercise concurrency 3.
  describe("concurrency", () => {
    function useHostedProvider() {
      (prisma.userSettings.findUnique as any).mockResolvedValue({
        settings: JSON.stringify({
          ai: { provider: AiProvider.OPENAI, model: "gpt-4o-mini" },
        }),
      });
    }

    function fiveFloorPassingJobs() {
      return [
        makeJob("Frontend Engineer", "React"),
        makeJob("Frontend Engineer", "React"),
        makeJob("Frontend Engineer", "React"),
        makeJob("Frontend Engineer", "React"),
        makeJob("Frontend Engineer", "React"),
      ];
    }

    it("in-flight tasks still save after aiError fires; queued tasks never dispatch", async () => {
      useHostedProvider();
      (searchGreenhouseJobs as any).mockResolvedValue({
        jobs: fiveFloorPassingJobs(),
        errors: [],
      });

      const pending = deferredGenerateTextQueue();
      const runPromise = runAutomation(automation);

      await vi.waitFor(() => expect(pending.length).toBe(3));

      pending[0].reject(new Error("fetch failed"));
      pending[1].resolve({ text: scoreText(90) });
      pending[2].resolve({ text: scoreText(85) });

      const result = await runPromise;

      // Queued jobs (4, 5) bail via the aiError check before ever calling
      // generateText, once aiError is set by job 0's failure.
      expect(pending.length).toBe(3);
      expect(result.status).toBe("completed_with_errors");
      // All 5 jobs persist: job 0 (and the 2 queued jobs) unanalyzed via
      // saveUnanalyzed(), jobs 1 and 2 analyzed successfully.
      expect((prisma.job.create as any).mock.calls.length).toBe(5);
      expect(result.jobsSaved).toBe(5);
      expect(result.jobsProcessed).toBe(2); // analyzed
      expect(result.jobsMatched).toBe(2); // highlighted (90, 85 >= 80)
    });

    it("aborting mid-run stops further saves for in-flight matches", async () => {
      useHostedProvider();
      (searchGreenhouseJobs as any).mockResolvedValue({
        jobs: fiveFloorPassingJobs().slice(0, 3),
        errors: [],
      });

      const pending = deferredGenerateTextQueue();
      const controller = new AbortController();
      const runPromise = runAutomation(automation, controller.signal);

      await vi.waitFor(() => expect(pending.length).toBe(3));

      pending[0].resolve({ text: scoreText(90) });
      // Wait for job 0's match to fully persist before aborting, so the
      // abort lands while jobs 1 and 2 are still in flight.
      await vi.waitFor(() =>
        expect((prisma.job.create as any).mock.calls.length).toBe(1),
      );

      controller.abort();
      pending[1].resolve({ text: scoreText(85) });
      pending[2].resolve({ text: scoreText(80) });

      const result = await runPromise;

      expect(result.status).toBe("cancelled");
      // Jobs 1 and 2 resolved successfully but hit the post-match abort
      // check before persisting — no saveUnanalyzed()/persist for them.
      expect((prisma.job.create as any).mock.calls.length).toBe(1);
      expect(result.jobsSaved).toBe(1);
    });

    it("counters are correct regardless of out-of-order completion", async () => {
      useHostedProvider();
      (searchGreenhouseJobs as any).mockResolvedValue({
        jobs: fiveFloorPassingJobs(),
        errors: [],
      });

      const pending = deferredGenerateTextQueue();
      const runPromise = runAutomation(automation);

      await vi.waitFor(() => expect(pending.length).toBe(3));

      // Resolve out of dispatch order, mixing above/below-threshold scores.
      pending[2].resolve({ text: scoreText(50) }); // below threshold (80)
      pending[0].resolve({ text: scoreText(90) }); // above
      pending[1].resolve({ text: scoreText(85) }); // above

      await vi.waitFor(() => expect(pending.length).toBe(5));

      pending[3].resolve({ text: scoreText(60) }); // below threshold
      pending[4].resolve({ text: scoreText(95) }); // above

      const result = await runPromise;

      expect(result.status).toBe("completed");
      expect((generateText as any).mock.calls.length).toBe(5);
      expect(result.jobsProcessed).toBe(5); // analyzed
      expect(result.jobsMatched).toBe(3); // highlighted: 90, 85, 95
      expect(result.jobsSaved).toBe(5);
    });
  });
});

const jsearchAutomation: Automation = {
  ...automation,
  id: "auto-js",
  jobBoard: "jsearch",
  keywords: "engineer",
  location: "Remote",
  sourceConfig: null,
};

function makeJSearchJob() {
  return {
    title: "Frontend Engineer",
    company: "Acme",
    location: "Remote",
    description: "React role",
    url: `https://jobs.example.com/${Math.random()}`,
    postedDate: "2026-06-01T00:00:00Z",
  };
}

describe("runAutomation (jsearch) concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.automationRun.create as any).mockResolvedValue({ id: "run1" });
    (prisma.automationRun.update as any).mockResolvedValue({
      id: "run1",
      automationId: "auto-js",
    });
    (prisma.automation.findUnique as any).mockResolvedValue({ scheduleHour: 8 });
    (prisma.automation.update as any).mockResolvedValue({});
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

    // Hosted provider -> concurrency 3 (Ollama would force 1).
    (prisma.userSettings.findUnique as any).mockResolvedValue({
      settings: JSON.stringify({
        ai: { provider: AiProvider.OPENAI, model: "gpt-4o-mini" },
      }),
    });
  });

  // Guards the fix for Finding 1: under concurrent dispatch, in-flight jobs
  // can still save after a sibling sets aiError, so the run must not report
  // "failed" while jobs were actually persisted.
  it("reports completed_with_errors (not failed) when aiError fires but jobs saved", async () => {
    (searchJSearchJobs as any).mockResolvedValue({
      success: true,
      data: [
        makeJSearchJob(),
        makeJSearchJob(),
        makeJSearchJob(),
        makeJSearchJob(),
        makeJSearchJob(),
      ],
    });

    const pending = deferredGenerateTextQueue();
    const runPromise = runAutomation(jsearchAutomation);

    await vi.waitFor(() => expect(pending.length).toBe(3));

    pending[0].reject(new Error("fetch failed")); // -> ai_unavailable
    pending[1].resolve({ text: scoreText(90) });
    pending[2].resolve({ text: scoreText(85) });

    const result = await runPromise;

    // Queued jobs (4, 5) bail on the aiError check before dispatching.
    expect(pending.length).toBe(3);
    expect(result.status).toBe("completed_with_errors");
    // Jobs 1 and 2 were in flight when job 0 failed; they still persist.
    expect(result.jobsSaved).toBe(2);
    expect((prisma.job.create as any).mock.calls.length).toBe(2);
    expect(result.jobsMatched).toBe(2);
  });
});
