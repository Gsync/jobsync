import {
  addStagePrepQuestions,
  removeStagePrepQuestion,
  setPrepQuestionAsked,
} from "@/actions/jobStage.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    jobStage: { findFirst: vi.fn() },
    question: { count: vi.fn() },
    jobStagePrepQuestion: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

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
  db.jobStage.findFirst.mockResolvedValue(interviewStage);
  db.question.count.mockResolvedValue(2);
  db.jobStagePrepQuestion.createMany.mockResolvedValue({ count: 2 });
  db.jobStagePrepQuestion.findMany.mockResolvedValue([]);
});

describe("addStagePrepQuestions", () => {
  // The question count must match the ids passed, or this fails on ownership
  // and never reaches the gate it claims to test.
  it("refuses a stage that is not an interview stage", async () => {
    db.jobStage.findFirst.mockResolvedValue({
      ...interviewStage,
      StageType: { id: "t-app", label: "Applied", statusId: "s-app", Status: { value: "applied" } },
    });
    db.question.count.mockResolvedValue(1);

    const res = await addStagePrepQuestions("st1", ["q1"]);

    expect(res.success).toBe(false);
    expect(res.message).toContain("not an interview stage");
    expect(res.message).toContain("Applied");
    expect(db.jobStagePrepQuestion.createMany).not.toHaveBeenCalled();
  });

  it("refuses when any question belongs to someone else", async () => {
    db.question.count.mockResolvedValue(1);

    const res = await addStagePrepQuestions("st1", ["q1", "someone-elses"]);

    expect(res.success).toBe(false);
    expect(db.jobStagePrepQuestion.createMany).not.toHaveBeenCalled();
  });

  it("links every question unasked", async () => {
    const res = await addStagePrepQuestions("st1", ["q1", "q2"]);

    expect(res.success).toBe(true);
    expect(db.jobStagePrepQuestion.createMany).toHaveBeenCalledWith({
      data: [
        { stageId: "st1", questionId: "q1", asked: false },
        { stageId: "st1", questionId: "q2", asked: false },
      ],
    });
  });

  // SQLite has no skipDuplicates, so the subtraction is ours to get right.
  it("skips questions already on the stage's prep list", async () => {
    db.jobStagePrepQuestion.findMany.mockResolvedValueOnce([
      { questionId: "q1" },
    ]);

    await addStagePrepQuestions("st1", ["q1", "q2"]);

    expect(db.jobStagePrepQuestion.createMany).toHaveBeenCalledWith({
      data: [{ stageId: "st1", questionId: "q2", asked: false }],
    });
  });

  it("writes nothing when every question is already linked", async () => {
    db.jobStagePrepQuestion.findMany.mockResolvedValueOnce([
      { questionId: "q1" },
      { questionId: "q2" },
    ]);

    const res = await addStagePrepQuestions("st1", ["q1", "q2"]);

    expect(res.success).toBe(true);
    expect(db.jobStagePrepQuestion.createMany).not.toHaveBeenCalled();
  });

  it("rejects an empty selection", async () => {
    const res = await addStagePrepQuestions("st1", []);

    expect(res.success).toBe(false);
    expect(db.jobStagePrepQuestion.createMany).not.toHaveBeenCalled();
  });
});

describe("setPrepQuestionAsked", () => {
  it("records askedAt when marking asked", async () => {
    db.jobStagePrepQuestion.updateMany.mockResolvedValue({ count: 1 });
    db.jobStagePrepQuestion.findFirst.mockResolvedValue({
      id: "p1",
      asked: true,
      askedAt: new Date(),
    });

    const res = await setPrepQuestionAsked("p1", true);

    expect(res.success).toBe(true);
    const call = db.jobStagePrepQuestion.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({
      id: "p1",
      Stage: { Job: { userId: user.id } },
      Question: { createdBy: user.id },
    });
    expect(call.data.asked).toBe(true);
    expect(call.data.askedAt).toBeInstanceOf(Date);
  });

  it("clears askedAt when unmarking", async () => {
    db.jobStagePrepQuestion.updateMany.mockResolvedValue({ count: 1 });
    db.jobStagePrepQuestion.findFirst.mockResolvedValue({
      id: "p1",
      asked: false,
      askedAt: null,
    });

    await setPrepQuestionAsked("p1", false);

    expect(db.jobStagePrepQuestion.updateMany.mock.calls[0][0].data).toEqual({
      asked: false,
      askedAt: null,
    });
  });

  it("fails when the row belongs to someone else", async () => {
    db.jobStagePrepQuestion.updateMany.mockResolvedValue({ count: 0 });

    const res = await setPrepQuestionAsked("someone-elses", true);

    expect(res.success).toBe(false);
  });
});

describe("removeStagePrepQuestion", () => {
  it("deletes through both ownership chains", async () => {
    db.jobStagePrepQuestion.deleteMany.mockResolvedValue({ count: 1 });

    const res = await removeStagePrepQuestion("p1");

    expect(res.success).toBe(true);
    expect(db.jobStagePrepQuestion.deleteMany.mock.calls[0][0].where).toEqual({
      id: "p1",
      Stage: { Job: { userId: user.id } },
      Question: { createdBy: user.id },
    });
  });
});
