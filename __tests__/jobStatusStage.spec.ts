import { updateJobStatus } from "@/actions/job.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";
import { resolveStageTypeForStatusId } from "@/lib/jobs/resolve";

vi.mock("@/lib/db", () => {
  const jobStage = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };
  const job = {
    update: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  };
  const client = {
    jobStage,
    job,
    $transaction: vi.fn(async (fn: any) => fn(client)),
  };
  return { default: client };
});
vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/jobs/resolve", () => ({
  resolveStageTypeForStatusId: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };
const interview = { id: "s-int", label: "Interview", value: "interview" };

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as any).mockResolvedValue(user);
  (resolveStageTypeForStatusId as any).mockResolvedValue("t-int");
  db.job.count.mockResolvedValue(1);
  db.job.findFirst.mockResolvedValue({ appliedDate: null });
  db.job.update.mockResolvedValue({ id: "j1" });
  db.jobStage.updateMany.mockResolvedValue({ count: 1 });
});

describe("updateJobStatus", () => {
  // The comparison is on PARENT STATUS, not stage type: re-picking Interview
  // while the current stage is "2nd Technical Interview" must append nothing,
  // or the timeline reads as a step backwards into screening.
  it("appends nothing when the current stage already carries that status", async () => {
    db.jobStage.findFirst.mockResolvedValue({
      id: "st-tech",
      StageType: { statusId: "s-int", Status: { value: "interview" } },
    });

    const res = await updateJobStatus("j1", interview as any);

    expect(res.success).toBe(true);
    expect(db.jobStage.create).not.toHaveBeenCalled();
    expect(db.job.update.mock.calls[0][0].data).toEqual({
      statusId: "s-int",
      applied: true,
    });
  });

  it("appends an undated current stage when the status genuinely changes", async () => {
    db.jobStage.findFirst.mockResolvedValue({
      id: "st-app",
      StageType: { statusId: "s-app", Status: { value: "applied" } },
    });
    db.jobStage.create.mockResolvedValue({ id: "st-new" });

    const res = await updateJobStatus("j1", interview as any);

    expect(res.success).toBe(true);
    expect(db.jobStage.create.mock.calls[0][0].data).toEqual({
      jobId: "j1",
      stageTypeId: "t-int",
      occurredAt: null,
      isCurrent: false,
    });
    // D8: the helper scopes its own writes rather than trusting the caller.
    expect(db.jobStage.updateMany).toHaveBeenCalledWith({
      where: {
        jobId: "j1",
        isCurrent: true,
        NOT: { id: "st-new" },
        Job: { userId: user.id },
      },
      data: { isCurrent: false },
    });
  });

  // D4: resolving writes through the base client, so it must not happen while
  // the transaction holds SQLite's write lock.
  it("resolves the stage type before opening the transaction", async () => {
    db.jobStage.findFirst.mockResolvedValue(null);
    db.jobStage.create.mockResolvedValue({ id: "st-first" });

    await updateJobStatus("j1", interview as any);

    const resolveOrder = (resolveStageTypeForStatusId as any).mock
      .invocationCallOrder[0];
    const txOrder = (db.$transaction as any).mock.invocationCallOrder[0];
    expect(resolveOrder).toBeLessThan(txOrder);
  });

  it("appends a first stage for a stageless job without failing", async () => {
    db.jobStage.findFirst.mockResolvedValue(null);
    db.jobStage.create.mockResolvedValue({ id: "st-first" });

    const res = await updateJobStatus("j1", interview as any);

    expect(res.success).toBe(true);
    expect(db.jobStage.create).toHaveBeenCalled();
  });

  it("refuses a job the caller does not own before writing a stage", async () => {
    db.job.count.mockResolvedValue(0);

    const res = await updateJobStatus("someone-elses", interview as any);

    expect(res.success).toBe(false);
    expect(db.jobStage.create).not.toHaveBeenCalled();
  });

  it("still writes applied and appliedDate for an Applied pick", async () => {
    db.jobStage.findFirst.mockResolvedValue(null);
    db.jobStage.create.mockResolvedValue({ id: "st-app" });

    await updateJobStatus("j1", {
      id: "s-app",
      label: "Applied",
      value: "applied",
    } as any);

    const data = db.job.update.mock.calls[0][0].data;
    expect(data.applied).toBe(true);
    expect(data.appliedDate).toBeInstanceOf(Date);
  });

  // D5: a deliberate change from today's behaviour, which re-stamped the date
  // on every Applied pick and moved the job on the dashboard's weekly chart.
  it("never moves an appliedDate the job already has", async () => {
    const original = new Date("2026-09-03T00:00:00Z");
    db.jobStage.findFirst.mockResolvedValue(null);
    db.jobStage.create.mockResolvedValue({ id: "st-app" });
    db.job.findFirst.mockResolvedValue({ appliedDate: original });

    await updateJobStatus("j1", {
      id: "s-app",
      label: "Applied",
      value: "applied",
    } as any);

    expect(db.job.update.mock.calls[0][0].data).not.toHaveProperty("appliedDate");
  });
});
