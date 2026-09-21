import {
  getAllJobStageTypes,
  getJobStageTypeList,
  createJobStageType,
  updateJobStageType,
  deleteJobStageTypeById,
} from "@/actions/jobStageType.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";
import { resolveJobStageType } from "@/lib/jobs/resolve";

vi.mock("@/lib/db", () => ({
  default: {
    jobStageType: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    jobStage: { count: vi.fn() },
    jobStatus: { findUnique: vi.fn(), findMany: vi.fn() },
    job: { findMany: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/jobs/resolve", () => ({ resolveJobStageType: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as any).mockResolvedValue(user);
  db.jobStage.count.mockResolvedValue(0);
  db.jobStatus.findUnique.mockResolvedValue({
    id: "s-int",
    label: "Interview",
    value: "interview",
  });
  db.jobStatus.findMany.mockResolvedValue([
    { label: "Draft" },
    { label: "Applied" },
    { label: "Interview" },
  ]);
  db.jobStageType.findFirst.mockResolvedValue(null);
  db.job.findMany.mockResolvedValue([]);
});

describe("getAllJobStageTypes", () => {
  it("scopes to the caller and orders by sortOrder then label", async () => {
    db.jobStageType.findMany.mockResolvedValue([]);

    await getAllJobStageTypes();

    const args = db.jobStageType.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ createdBy: user.id });
    expect(args.orderBy).toEqual([{ sortOrder: "asc" }, { label: "asc" }]);
    expect(args.include).toEqual({ Status: true });
  });
});

describe("getJobStageTypeList", () => {
  // getReferenceEntityList groups by an FK on Job, and a stage type reaches
  // Job only through JobStage — so this is a dedicated read, like roles.
  it("counts stages through the relation, not through a job groupBy", async () => {
    db.jobStageType.findMany.mockResolvedValue([]);
    db.jobStageType.count.mockResolvedValue(0);

    await getJobStageTypeList(1, 25);

    const args = db.jobStageType.findMany.mock.calls[0][0];
    expect(args.include._count).toEqual({ select: { stages: true } });
  });
});

describe("createJobStageType", () => {
  it("refuses a status that does not exist", async () => {
    db.jobStatus.findUnique.mockResolvedValue(null);

    const res = await createJobStageType("Panel", "nope");

    expect(res.success).toBe(false);
    expect(resolveJobStageType).not.toHaveBeenCalled();
  });

  it("delegates to the resolver so canonical-equal names collapse", async () => {
    (resolveJobStageType as any).mockResolvedValue({ id: "t1", label: "Panel", created: true });

    const res = await createJobStageType(" Panel ", "s-int");

    expect(res.success).toBe(true);
    expect(resolveJobStageType).toHaveBeenCalledWith(" Panel ", user.id, "s-int");
  });

  // The resolver returns an existing type by name and ignores the requested
  // status, so without this the call reports success having done nothing.
  it("refuses a name already taken under a different status", async () => {
    db.jobStageType.findFirst.mockResolvedValue({
      label: "Applied",
      Status: { label: "Applied" },
    });

    const res = await createJobStageType("Applied", "s-int");

    expect(res.success).toBe(false);
    expect(res.message).toContain("Applied");
    expect(resolveJobStageType).not.toHaveBeenCalled();
  });
});

describe("updateJobStageType", () => {
  // The status menus resolve through these by name, so a retarget would make
  // every later status change write a stage contradicting Job.statusId.
  it("refuses to move a status-named type under another status", async () => {
    db.jobStageType.findFirst.mockResolvedValue({
      value: "interview",
      statusId: "s-app",
    });

    const res = await updateJobStageType("t1", "Interview", "s-int", 3);

    expect(res.success).toBe(false);
    expect(db.jobStageType.update).not.toHaveBeenCalled();
  });

  it("re-derives the jobs sitting on a custom type it moves", async () => {
    db.jobStageType.findFirst.mockResolvedValue({
      value: "take-home",
      statusId: "s-app",
    });
    db.job.findMany.mockResolvedValue([
      {
        id: "j1",
        appliedDate: null,
        stages: [{ occurredAt: new Date("2026-09-01T00:00:00Z") }],
      },
    ]);

    const res = await updateJobStageType("t1", "Take-home", "s-int", 3);

    expect(res.success).toBe(true);
    expect(db.job.update.mock.calls[0][0].data.statusId).toBe("s-int");
  });

  it("leaves jobs alone when only the label and order change", async () => {
    db.jobStageType.findFirst.mockResolvedValue({
      value: "take-home",
      statusId: "s-int",
    });

    const res = await updateJobStageType("t1", "Take-home Task", "s-int", 4);

    expect(res.success).toBe(true);
    expect(db.job.findMany).not.toHaveBeenCalled();
  });
});

describe("deleteJobStageTypeById", () => {
  it("blocks the delete with a counted message when stages use the type", async () => {
    db.jobStage.count.mockResolvedValue(4);

    const res = await deleteJobStageTypeById("t1");

    expect(res.success).toBe(false);
    expect(res.message).toContain("4");
    expect(db.jobStageType.delete).not.toHaveBeenCalled();
  });

  it("deletes an unused type, scoped to the caller", async () => {
    db.jobStageType.delete.mockResolvedValue({ id: "t1" });

    const res = await deleteJobStageTypeById("t1");

    expect(res.success).toBe(true);
    expect(db.jobStageType.delete).toHaveBeenCalledWith({
      where: { id: "t1", createdBy: user.id },
    });
  });
});
