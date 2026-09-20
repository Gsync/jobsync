import { persistDiscoveredJob } from "@/lib/scraper/automation-run/persist";
import { mapScrapedJobToJobRecord } from "@/lib/scraper/mapper";
import db from "@/lib/db";
import { resolveStageTypeForStatusId } from "@/lib/jobs/resolve";

vi.mock("@/lib/db", () => ({
  default: { job: { create: vi.fn() }, jobStage: { create: vi.fn() } },
}));
vi.mock("@/lib/scraper/mapper", () => ({ mapScrapedJobToJobRecord: vi.fn() }));
vi.mock("@/lib/jobs/resolve", () => ({
  resolveStageTypeForStatusId: vi.fn(),
}));

const mockDb = db as any;
const createdAt = new Date("2026-09-19T00:00:00Z");

const automation = { id: "a1", userId: "u1", jobBoard: "greenhouse" } as any;
const job = {
  title: "Engineer",
  company: "Acme",
  location: "Remote",
  description: "Build things",
  url: "https://boards.greenhouse.io/acme/jobs/1",
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  (resolveStageTypeForStatusId as any).mockResolvedValue("t-new");
  (mapScrapedJobToJobRecord as any).mockResolvedValue({
    statusId: "s-new",
    createdAt,
    tags: { connect: [] },
  });
  mockDb.job.create.mockResolvedValue({ id: "j1", createdAt });
});

describe("persistDiscoveredJob", () => {
  it("gives a discovered job its first current stage", async () => {
    const res = await persistDiscoveredJob(automation, job, 50, {}, []);

    expect(res.saved).toBe(true);
    expect(resolveStageTypeForStatusId).toHaveBeenCalledWith("s-new", "u1");
    expect(mockDb.job.create.mock.calls[0][0].data.stages).toEqual({
      create: { stageTypeId: "t-new", occurredAt: createdAt, isCurrent: true },
    });
  });

  // A concurrent run won the dedup race. The stage rides on the same
  // statement, so it goes down with the job rather than orphaning.
  it("saves nothing when the unique index refuses the job", async () => {
    mockDb.job.create.mockRejectedValue({ code: "P2002" });

    const res = await persistDiscoveredJob(automation, job, 50, {}, []);

    expect(res.saved).toBe(false);
  });
});
