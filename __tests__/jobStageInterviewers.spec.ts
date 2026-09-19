import {
  linkStageInterviewer,
  unlinkStageInterviewer,
} from "@/actions/jobStage.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";
import { resolveContactRole } from "@/lib/jobs/resolve";

vi.mock("@/lib/db", () => ({
  default: {
    jobStage: { findFirst: vi.fn() },
    contact: { count: vi.fn() },
    jobStageInterviewer: {
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    jobContact: { findFirst: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/jobs/resolve", () => ({ resolveContactRole: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };

const interviewStage = {
  id: "st1",
  jobId: "j1",
  occurredAt: null,
  isCurrent: true,
  StageType: {
    id: "t-int",
    label: "Final / Onsite Interview",
    statusId: "s-int",
    Status: { value: "interview" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as any).mockResolvedValue(user);
  (resolveContactRole as any).mockResolvedValue({ id: "r-int", label: "Interviewer" });
  db.jobStage.findFirst.mockResolvedValue(interviewStage);
  db.contact.count.mockResolvedValue(1);
  db.jobContact.findFirst.mockResolvedValue(null);
  db.jobStageInterviewer.create.mockResolvedValue({ id: "link1" });
});

describe("linkStageInterviewer", () => {
  it("refuses a stage the caller does not own", async () => {
    db.jobStage.findFirst.mockResolvedValue(null);

    const res = await linkStageInterviewer("someone-elses-stage", "c1");

    expect(res.success).toBe(false);
    expect(db.jobStageInterviewer.create).not.toHaveBeenCalled();
  });

  // Owning the stage is not permission to attach someone else's contact.
  it("refuses a contact the caller does not own", async () => {
    db.contact.count.mockResolvedValue(0);

    const res = await linkStageInterviewer("st1", "someone-elses-contact");

    expect(res.success).toBe(false);
    expect(db.jobStageInterviewer.create).not.toHaveBeenCalled();
  });

  it("refuses a stage that is not an interview stage", async () => {
    db.jobStage.findFirst.mockResolvedValue({
      ...interviewStage,
      StageType: {
        id: "t-app",
        label: "Applied",
        statusId: "s-app",
        Status: { value: "applied" },
      },
    });

    const res = await linkStageInterviewer("st1", "c1");

    expect(res.success).toBe(false);
    expect(res.message).toContain("not an interview stage");
    expect(db.jobStageInterviewer.create).not.toHaveBeenCalled();
  });

  it("links and upserts a JobContact with the interviewer role", async () => {
    const res = await linkStageInterviewer("st1", "c1");

    expect(res.success).toBe(true);
    expect(db.jobStageInterviewer.create.mock.calls[0][0].data).toEqual({
      stageId: "st1",
      contactId: "c1",
    });
    // Resolve-or-create: the seeded role is renameable and deletable.
    expect(resolveContactRole).toHaveBeenCalledWith("Interviewer", user.id);
    expect(db.jobContact.create.mock.calls[0][0].data).toEqual({
      jobId: "j1",
      contactId: "c1",
      roleId: "r-int",
    });
  });

  it("does not duplicate an existing JobContact for that role", async () => {
    db.jobContact.findFirst.mockResolvedValue({ id: "jc1" });

    await linkStageInterviewer("st1", "c1");

    expect(db.jobContact.create).not.toHaveBeenCalled();
  });

  it("reports a friendly message when the contact is already on the stage", async () => {
    db.jobStageInterviewer.create.mockRejectedValue({ code: "P2002" });

    const res = await linkStageInterviewer("st1", "c1");

    expect(res.success).toBe(false);
    expect(res.message).toContain("already");
  });
});

describe("unlinkStageInterviewer", () => {
  it("deletes through both ownership chains and leaves the JobContact alone", async () => {
    db.jobStageInterviewer.deleteMany.mockResolvedValue({ count: 1 });

    const res = await unlinkStageInterviewer("link1");

    expect(res.success).toBe(true);
    expect(db.jobStageInterviewer.deleteMany.mock.calls[0][0].where).toEqual({
      id: "link1",
      Stage: { Job: { userId: user.id } },
      Contact: { createdBy: user.id },
    });
    expect(db.jobContact.create).not.toHaveBeenCalled();
  });

  it("fails when nothing matched", async () => {
    db.jobStageInterviewer.deleteMany.mockResolvedValue({ count: 0 });

    const res = await unlinkStageInterviewer("nope");

    expect(res.success).toBe(false);
  });
});
