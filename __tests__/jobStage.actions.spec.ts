import {
  getJobStages,
  addJobStage,
  deleteJobStage,
  setCurrentJobStage,
  setStageNotes,
} from "@/actions/jobStage.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";
import { resolveJobStageType } from "@/lib/jobs/resolve";

vi.mock("@/lib/db", () => {
  const jobStage = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  };
  const job = { count: vi.fn(), findFirst: vi.fn(), update: vi.fn() };
  const jobStageType = { findFirst: vi.fn() };
  const client = {
    jobStage,
    job,
    jobStageType,
    $transaction: vi.fn(async (fn: any) => fn(client)),
  };
  return { default: client };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/jobs/resolve", () => ({
  resolveJobStageType: vi.fn(),
  resolveStageTypeForStatusId: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };
const at = (iso: string) => new Date(iso);

const interviewType = {
  id: "t-int",
  label: "Final / Onsite Interview",
  statusId: "s-int",
  Status: { value: "interview" },
};

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as any).mockResolvedValue(user);
  db.job.count.mockResolvedValue(1);
  db.job.findFirst.mockResolvedValue({ appliedDate: null });
  db.jobStage.updateMany.mockResolvedValue({ count: 1 });
});

describe("getJobStages", () => {
  it("scopes the read through the job's owner and sorts undated stages last", async () => {
    db.jobStage.findMany.mockResolvedValue([
      { id: "c", occurredAt: null, createdAt: at("2026-01-01T00:00:00Z"), StageType: { sortOrder: 3 } },
      { id: "a", occurredAt: at("2026-09-01T00:00:00Z"), createdAt: at("2026-01-01T00:00:00Z"), StageType: { sortOrder: 3 } },
    ]);

    const stages = await getJobStages("j1");

    expect(db.jobStage.findMany.mock.calls[0][0].where).toEqual({
      jobId: "j1",
      Job: { userId: user.id },
    });
    expect(stages.map((s: any) => s.id)).toEqual(["a", "c"]);
  });
});

describe("addJobStage", () => {
  it("refuses a job the caller does not own", async () => {
    db.job.count.mockResolvedValue(0);

    const res = await addJobStage({
      jobId: "someone-elses",
      stageTypeId: "t-int",
      setAsCurrent: true,
    } as any);

    expect(res.success).toBe(false);
    expect(db.jobStage.create).not.toHaveBeenCalled();
  });

  it("refuses a stage type the caller does not own", async () => {
    db.jobStageType.findFirst.mockResolvedValue(null);

    const res = await addJobStage({
      jobId: "j1",
      stageTypeId: "someone-elses-type",
      setAsCurrent: true,
    } as any);

    expect(res.success).toBe(false);
    expect(db.jobStage.create).not.toHaveBeenCalled();
  });

  it("creates a custom type through the resolver and uses its id", async () => {
    (resolveJobStageType as any).mockResolvedValue({
      id: "t-new",
      label: "Panel Interview",
      created: true,
    });
    db.jobStage.create.mockResolvedValue({ id: "st1" });
    db.jobStage.findFirst.mockResolvedValue({
      id: "st1",
      occurredAt: null,
      StageType: { statusId: "s-int", Status: { value: "interview" } },
    });

    const res = await addJobStage({
      jobId: "j1",
      customLabel: "Panel Interview",
      customStatusId: "s-int",
      setAsCurrent: true,
    } as any);

    expect(resolveJobStageType).toHaveBeenCalledWith(
      "Panel Interview",
      user.id,
      "s-int",
    );
    expect(res.success).toBe(true);
    expect(db.jobStage.create.mock.calls[0][0].data.stageTypeId).toBe("t-new");
  });

  it("clears the old current stage and rewrites the job status when set as current", async () => {
    db.jobStageType.findFirst.mockResolvedValue(interviewType);
    db.jobStage.create.mockResolvedValue({ id: "st2" });
    db.jobStage.findFirst.mockResolvedValue({
      id: "st2",
      occurredAt: null,
      StageType: { statusId: "s-int", Status: { value: "interview" } },
    });

    const res = await addJobStage({
      jobId: "j1",
      stageTypeId: "t-int",
      setAsCurrent: true,
    } as any);

    expect(res.success).toBe(true);
    // D8: promoteStage names the owner in both of its updateMany calls.
    expect(db.jobStage.updateMany).toHaveBeenCalledWith({
      where: {
        jobId: "j1",
        isCurrent: true,
        NOT: { id: "st2" },
        Job: { userId: user.id },
      },
      data: { isCurrent: false },
    });
    expect(db.job.update.mock.calls[0][0].data).toEqual({
      statusId: "s-int",
      applied: true,
    });
  });

  it("leaves the current stage and the job status alone when not set as current", async () => {
    db.jobStageType.findFirst.mockResolvedValue({
      id: "t-app",
      label: "Applied",
      statusId: "s-app",
      Status: { value: "applied" },
    });
    db.jobStage.create.mockResolvedValue({ id: "st3" });
    db.jobStage.findFirst.mockResolvedValue({ id: "st3" });

    const res = await addJobStage({
      jobId: "j1",
      stageTypeId: "t-app",
      setAsCurrent: false,
    } as any);

    expect(res.success).toBe(true);
    expect(db.jobStage.updateMany).not.toHaveBeenCalled();
    expect(db.job.update).not.toHaveBeenCalled();
  });

  it("sets appliedDate from a backdated applied stage", async () => {
    const backdated = at("2026-08-12T00:00:00Z");
    db.jobStageType.findFirst.mockResolvedValue({
      id: "t-app",
      label: "Applied",
      statusId: "s-app",
      Status: { value: "applied" },
    });
    db.jobStage.create.mockResolvedValue({ id: "st4" });
    db.jobStage.findFirst.mockResolvedValue({
      id: "st4",
      occurredAt: backdated,
      StageType: { statusId: "s-app", Status: { value: "applied" } },
    });

    await addJobStage({
      jobId: "j1",
      stageTypeId: "t-app",
      date: backdated,
      setAsCurrent: true,
    } as any);

    expect(db.job.update.mock.calls[0][0].data.appliedDate).toEqual(backdated);
  });
});

describe("deleteJobStage", () => {
  it("promotes the previous stage and rewrites the status when deleting the current one", async () => {
    db.jobStage.findFirst
      // assertStageOwned
      .mockResolvedValueOnce({
        id: "st-cur",
        jobId: "j1",
        occurredAt: null,
        isCurrent: true,
        StageType: interviewType,
      })
      // syncJobFromCurrentStage's own scoped read
      .mockResolvedValue({
        occurredAt: at("2026-09-03T00:00:00Z"),
        StageType: { statusId: "s-app", Status: { value: "applied" } },
      });
    db.jobStage.findMany.mockResolvedValue([
      { id: "st-prev", occurredAt: at("2026-09-03T00:00:00Z"), createdAt: at("2026-09-03T00:00:00Z") },
    ]);

    const res = await deleteJobStage("st-cur");

    expect(res.success).toBe(true);
    expect(db.jobStage.delete).toHaveBeenCalledWith({ where: { id: "st-cur" } });
    expect(db.jobStage.updateMany).toHaveBeenCalledWith({
      where: { id: "st-prev", Job: { userId: user.id } },
      data: { isCurrent: true },
    });
    expect(db.job.update.mock.calls[0][0].data.statusId).toBe("s-app");
  });

  // Undated stages sort last, so the tail of the sorted list is the wrong
  // successor whenever the job holds a dateless stage.
  it("promotes the furthest-along dated stage, not a dateless one", async () => {
    db.jobStage.findFirst
      .mockResolvedValueOnce({
        id: "st-cur",
        jobId: "j1",
        occurredAt: at("2026-10-01T00:00:00Z"),
        isCurrent: true,
        StageType: interviewType,
      })
      .mockResolvedValue({
        occurredAt: at("2026-09-03T00:00:00Z"),
        StageType: { statusId: "s-app", Status: { value: "applied" } },
      });
    db.jobStage.findMany.mockResolvedValue([
      { id: "st-applied", occurredAt: at("2026-09-03T00:00:00Z"), createdAt: at("2026-09-03T00:00:00Z"), StageType: { sortOrder: 2 } },
      { id: "st-undated", occurredAt: null, createdAt: at("2026-09-20T00:00:00Z"), StageType: { sortOrder: 3 } },
    ]);

    await deleteJobStage("st-cur");

    expect(db.jobStage.updateMany).toHaveBeenCalledWith({
      where: { id: "st-applied", Job: { userId: user.id } },
      data: { isCurrent: true },
    });
  });

  it("leaves the status untouched when the deleted stage was the only one", async () => {
    db.jobStage.findFirst.mockResolvedValueOnce({
      id: "st-only",
      jobId: "j1",
      occurredAt: null,
      isCurrent: true,
      StageType: interviewType,
    });
    db.jobStage.findMany.mockResolvedValue([]);

    const res = await deleteJobStage("st-only");

    expect(res.success).toBe(true);
    expect(db.job.update).not.toHaveBeenCalled();
  });

  it("leaves the status untouched when deleting a non-current stage", async () => {
    db.jobStage.findFirst.mockResolvedValueOnce({
      id: "st-old",
      jobId: "j1",
      occurredAt: at("2026-09-01T00:00:00Z"),
      isCurrent: false,
      StageType: interviewType,
    });

    const res = await deleteJobStage("st-old");

    expect(res.success).toBe(true);
    expect(db.jobStage.findMany).not.toHaveBeenCalled();
    expect(db.job.update).not.toHaveBeenCalled();
  });

  it("refuses a stage the caller does not own", async () => {
    db.jobStage.findFirst.mockResolvedValueOnce(null);

    const res = await deleteJobStage("someone-elses");

    expect(res.success).toBe(false);
    expect(db.jobStage.delete).not.toHaveBeenCalled();
  });
});

describe("setCurrentJobStage", () => {
  it("promotes the stage and rewrites the job status from its type", async () => {
    db.jobStage.findFirst
      // assertStageOwned
      .mockResolvedValueOnce({
        id: "st9",
        jobId: "j1",
        occurredAt: null,
        isCurrent: false,
        StageType: interviewType,
      })
      // syncJobFromCurrentStage's own scoped read
      .mockResolvedValue({
        occurredAt: null,
        StageType: { statusId: "s-int", Status: { value: "interview" } },
      });

    const res = await setCurrentJobStage("st9");

    expect(res.success).toBe(true);
    // D8: every stage write names the owner, so this is updateMany with the
    // ownership chain, not a bare update by id.
    expect(db.jobStage.updateMany).toHaveBeenCalledWith({
      where: { id: "st9", Job: { userId: user.id } },
      data: { isCurrent: true },
    });
    expect(db.job.update.mock.calls[0][0].where).toEqual({
      id: "j1",
      userId: user.id,
    });
    expect(db.job.update.mock.calls[0][0].data.statusId).toBe("s-int");
  });
});

describe("setStageNotes", () => {
  it("saves a note through both the ownership check and the scoped write", async () => {
    db.jobStage.findFirst.mockResolvedValueOnce({
      id: "st1",
      jobId: "j1",
      occurredAt: null,
      isCurrent: true,
      StageType: interviewType,
    });

    const res = await setStageNotes("st1", "  They pushed hard on caching.  ");

    expect(res.success).toBe(true);
    const call = db.jobStage.updateMany.mock.calls.at(-1)[0];
    expect(call.where).toEqual({ id: "st1", Job: { userId: user.id } });
    expect(call.data).toEqual({ notes: "They pushed hard on caching." });
  });

  it("stores an emptied note as null rather than an empty string", async () => {
    db.jobStage.findFirst.mockResolvedValueOnce({
      id: "st1",
      jobId: "j1",
      occurredAt: null,
      isCurrent: true,
      StageType: interviewType,
    });

    await setStageNotes("st1", "   ");

    expect(db.jobStage.updateMany.mock.calls.at(-1)[0].data).toEqual({
      notes: null,
    });
  });
});
