import { createJobRecord, createFirstStage } from "@/lib/jobs/createJobRecord";
import prisma from "@/lib/db";
import { resolveStageTypeForStatusId } from "@/lib/jobs/resolve";

vi.mock("@/lib/db", () => ({
  default: {
    job: { create: vi.fn() },
    jobStage: { create: vi.fn() },
  },
}));
vi.mock("@/lib/jobs/resolve", () => ({
  resolveStageTypeForStatusId: vi.fn(),
}));

const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  (resolveStageTypeForStatusId as any).mockResolvedValue("t-draft");
  db.job.create.mockResolvedValue({ id: "j1", createdAt: new Date("2026-09-19T00:00:00Z") });
});

describe("createFirstStage", () => {
  it("writes one current stage dated at the job's creation", async () => {
    const created = new Date("2026-09-19T00:00:00Z");

    await createFirstStage(db, "j1", "s-draft", "u1", created);

    expect(resolveStageTypeForStatusId).toHaveBeenCalledWith("s-draft", "u1");
    expect(db.jobStage.create).toHaveBeenCalledWith({
      data: {
        jobId: "j1",
        stageTypeId: "t-draft",
        occurredAt: created,
        isCurrent: true,
      },
    });
  });
});

describe("createJobRecord", () => {
  it("gives every new job exactly one current stage", async () => {
    await createJobRecord({
      jobTitleId: "t1",
      companyId: "c1",
      statusId: "s-draft",
      description: "<p>x</p>",
      jobType: "full-time",
      userId: "u1",
    } as any);

    expect(db.jobStage.create).toHaveBeenCalledTimes(1);
    expect(db.jobStage.create.mock.calls[0][0].data.isCurrent).toBe(true);
  });
});
