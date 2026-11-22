import { saveQuestions } from "@/lib/questions/saveQuestions";
import { resolveTags } from "@/lib/jobs/resolve";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";
import { PrismaClient } from "@/generated/prisma/client";
import type { BankQuestion, SaveQuestionsOptions } from "@/models/question.model";

const prisma = new PrismaClient({} as never);

vi.mock("@/generated/prisma/client", () => {
  const mPrismaClient = {
    question: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/jobs/resolve", () => ({ resolveTags: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ log: { error: vi.fn() } }));

const USER = "user-1";
const CHAT: SaveQuestionsOptions = { createdVia: "chat", replaceAgentCreatedOnly: false };
const MCP: SaveQuestionsOptions = { createdVia: "Claude Desktop", replaceAgentCreatedOnly: true };
const ANSWER = "Roll back first, then read the logs.";

const row = (overrides: Partial<BankQuestion> & { id: string; question: string }): BankQuestion => ({
  answer: "<p>Saved answer</p>",
  createdVia: null,
  tags: [],
  ...overrides,
});

const bank = (...rows: BankQuestion[]) => (prisma.question.findMany as any).mockResolvedValue(rows);
const createData = (call = 0) => (prisma.question.create as any).mock.calls[call][0].data;
const updateArgs = (call = 0) => (prisma.question.update as any).mock.calls[call][0];

const DEPLOY = "How do you handle a failing deploy?";

describe("saveQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bank();
    (resolveTags as any).mockResolvedValue({ resolved: [], dropped: [] });
    (prisma.question.create as any).mockResolvedValue({ id: "new-1" });
    (prisma.question.update as any).mockResolvedValue({ id: "q-1" });
  });

  it("loads only the user's bank", async () => {
    await saveQuestions([{ question: DEPLOY }], USER, CHAT);
    expect((prisma.question.findMany as any).mock.calls[0][0].where).toEqual({ createdBy: USER });
  });

  it("an answerless question saves TBD", async () => {
    await saveQuestions([{ question: DEPLOY }], USER, CHAT);
    expect(createData()).toMatchObject({ answer: "TBD", createdVia: "chat", createdBy: USER });
  });

  it("renders the markdown answer", async () => {
    await saveQuestions([{ question: DEPLOY, answer: "**Roll back** first." }], USER, CHAT);
    expect(createData().answer).toContain("<strong>");
  });

  it("connects resolved tags on insert", async () => {
    (resolveTags as any).mockResolvedValue({
      resolved: [{ id: "tag-1", label: "CI/CD", created: true }],
      dropped: ["Extra"],
    });
    const [result] = await saveQuestions([{ question: DEPLOY, tags: ["CI/CD"] }], USER, CHAT);
    expect(resolveTags).toHaveBeenCalledWith(["CI/CD"], USER, 10);
    expect(createData().tags).toEqual({ connect: [{ id: "tag-1" }] });
    expect(result).toMatchObject({
      status: "saved",
      tags: [{ id: "tag-1", label: "CI/CD", created: true }],
      droppedTags: ["Extra"],
    });
  });

  it("tag reports carry only id, label and created", async () => {
    bank(row({ id: "q-1", question: DEPLOY }));
    (resolveTags as any).mockResolvedValue({
      resolved: [{ id: "tag-1", label: "CI/CD", value: "ci/cd", createdBy: USER, created: false }],
      dropped: [],
    });
    const results = await saveQuestions(
      [
        { question: "Describe your ideal team", tags: ["CI/CD"] },
        { question: DEPLOY, answer: ANSWER, tags: ["CI/CD"], mergeInto: { questionId: "q-1", mode: "append" } },
      ],
      USER,
      CHAT,
    );
    for (const result of results) {
      expect(result).toMatchObject({ tags: [{ id: "tag-1", label: "CI/CD", created: false }] });
      expect(JSON.stringify(result)).not.toContain(USER);
    }
  });

  it("re-sent questions never create a row", async () => {
    bank(
      row({ id: "q-a", question: "Tell me about yourself" }),
      row({ id: "q-b", question: "Why Postgres over Mongo?", answer: "TBD" }),
    );
    const results = await saveQuestions(
      [{ question: "Tell me about yourself", answer: ANSWER }, { question: "Why Postgres over Mongo?" }],
      USER,
      CHAT,
    );
    expect(results.map((r) => r.status)).toEqual(["exists", "skipped"]);
    expect(prisma.question.create).not.toHaveBeenCalled();
  });

  it("exact match with notSameAs creates nothing", async () => {
    bank(row({ id: "q-1", question: DEPLOY }));
    const [result] = await saveQuestions([{ question: DEPLOY, notSameAs: ["q-1"] }], USER, CHAT);
    expect(result.status).toBe("skipped");
    expect(prisma.question.create).not.toHaveBeenCalled();
  });

  it("notSameAs covering every recomputed candidate saves; missing one holds as similar", async () => {
    bank(
      row({ id: "q-1", question: "How do you handle a failing build?" }),
      row({ id: "q-2", question: "How do you deal with a broken deployment?" }),
    );
    const [held] = await saveQuestions([{ question: DEPLOY, notSameAs: ["q-1"] }], USER, CHAT);
    expect(held.status).toBe("similar");
    expect(prisma.question.create).not.toHaveBeenCalled();

    const [saved] = await saveQuestions([{ question: DEPLOY, notSameAs: ["q-1", "q-2"] }], USER, CHAT);
    expect(saved.status).toBe("saved");
    expect(prisma.question.create).toHaveBeenCalledTimes(1);
  });

  it("append to an answered question joins with the separator", async () => {
    bank(row({ id: "q-1", question: DEPLOY }));
    const [result] = await saveQuestions(
      [{ question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "append" } }],
      USER,
      CHAT,
    );
    expect(result).toMatchObject({ status: "merged", mode: "append" });
    expect(updateArgs().data.answer).toMatch(/^<p>Saved answer<\/p><hr><p>Roll back first/);
  });

  it("append to <p>TBD</p> sets it", async () => {
    bank(row({ id: "q-1", question: DEPLOY, answer: "<p>TBD</p>" }));
    await saveQuestions(
      [{ question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "append" } }],
      USER,
      CHAT,
    );
    const { answer } = updateArgs().data;
    expect(answer).toContain("Roll back first");
    expect(answer).not.toContain("TBD");
    expect(answer).not.toContain("<hr>");
  });

  it("replace overwrites", async () => {
    bank(row({ id: "q-1", question: DEPLOY }));
    await saveQuestions(
      [{ question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "replace" } }],
      USER,
      CHAT,
    );
    expect(updateArgs().data.answer).toBe("<p>Roll back first, then read the logs.</p>\n");
  });

  it("replace on an unanswered question is invalid and writes nothing", async () => {
    bank(row({ id: "q-1", question: DEPLOY, answer: "TBD" }));
    const [result] = await saveQuestions(
      [{ question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "replace" } }],
      USER,
      CHAT,
    );
    expect(result.status).toBe("invalid");
    expect(prisma.question.update).not.toHaveBeenCalled();
  });

  it("update is ownership-scoped and leaves text and createdVia alone", async () => {
    bank(row({ id: "q-1", question: DEPLOY }));
    await saveQuestions(
      [{ question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "append" } }],
      USER,
      CHAT,
    );
    const { where, data } = updateArgs();
    expect(where).toEqual({ id: "q-1", createdBy: USER });
    expect(Object.keys(data).sort()).toEqual(["answer", "tags"]);
  });

  it("mergeInto another user's id is invalid and nothing is written", async () => {
    bank(row({ id: "q-1", question: DEPLOY }));
    const [result] = await saveQuestions(
      [{ question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "other-user-q", mode: "append" } }],
      USER,
      CHAT,
    );
    expect(result.status).toBe("invalid");
    expect(prisma.question.update).not.toHaveBeenCalled();
    expect(prisma.question.create).not.toHaveBeenCalled();
  });

  it("MCP replace refused on an app-created question, allowed on an agent-created one", async () => {
    const input = [{ question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "replace" as const } }];
    bank(row({ id: "q-1", question: DEPLOY }));
    const [refused] = await saveQuestions(input, USER, MCP);
    expect(refused).toMatchObject({ status: "invalid", appendOnly: true });
    expect(prisma.question.update).not.toHaveBeenCalled();

    bank(row({ id: "q-1", question: DEPLOY, createdVia: "Claude Desktop" }));
    const [allowed] = await saveQuestions(input, USER, MCP);
    expect(allowed).toMatchObject({ status: "merged", mode: "replace" });
    expect(prisma.question.update).toHaveBeenCalledTimes(1);
  });

  it("tags already on the saved question do not consume the cap", async () => {
    const tags = ["Postgres", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"].map((label, i) => ({
      id: `t-${i}`,
      value: canonicalizeEntityValue(label),
    }));
    bank(row({ id: "q-1", question: DEPLOY, tags }));
    await saveQuestions(
      [{ question: DEPLOY, answer: ANSWER, tags: ["Postgres", "Redis"], mergeInto: { questionId: "q-1", mode: "append" } }],
      USER,
      CHAT,
    );
    expect(resolveTags).toHaveBeenCalledWith(["Redis"], USER, 1);
  });

  it("combined length over the limit is invalid and writes nothing", async () => {
    bank(row({ id: "q-1", question: DEPLOY, answer: `<p>${"x".repeat(4980)}</p>` }));
    const [result] = await saveQuestions(
      [{ question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "append" } }],
      USER,
      CHAT,
    );
    expect(result).toMatchObject({
      status: "invalid",
      error: "The combined answer would exceed 5000 characters. Replace the saved answer instead, or shorten it.",
    });
    expect(prisma.question.update).not.toHaveBeenCalled();
    expect(resolveTags).not.toHaveBeenCalled();
  });

  describe("final HTML over the limit is invalid on every path", () => {
    const long = "x".repeat(5000);
    const message = "The answer would exceed 5000 characters once saved. Shorten it.";

    afterEach(() => {
      expect(prisma.question.create).not.toHaveBeenCalled();
      expect(prisma.question.update).not.toHaveBeenCalled();
      expect(resolveTags).not.toHaveBeenCalled();
    });

    it("insert", async () => {
      const [result] = await saveQuestions([{ question: DEPLOY, answer: long }], USER, CHAT);
      expect(result).toMatchObject({ status: "invalid", error: message });
    });

    it("replace", async () => {
      bank(row({ id: "q-1", question: DEPLOY }));
      const [result] = await saveQuestions(
        [{ question: DEPLOY, answer: long, mergeInto: { questionId: "q-1", mode: "replace" } }],
        USER,
        CHAT,
      );
      expect(result).toMatchObject({ status: "invalid", error: message });
    });

    it("append onto TBD", async () => {
      bank(row({ id: "q-1", question: DEPLOY, answer: "<p>TBD</p>" }));
      const [result] = await saveQuestions(
        [{ question: DEPLOY, answer: long, mergeInto: { questionId: "q-1", mode: "append" } }],
        USER,
        CHAT,
      );
      expect(result).toMatchObject({ status: "invalid", error: message });
    });
  });

  it("a failed write fails only its item", async () => {
    const q1 = row({ id: "q-1", question: "Tell me about yourself" });
    const q2 = row({ id: "q-2", question: "Why Postgres over Mongo?" });
    bank(q1, q2);
    (prisma.question.update as any)
      .mockResolvedValueOnce({ id: "q-1" })
      .mockRejectedValueOnce(new Error("connection reset by secret-host"));
    const input = [
      { question: q1.question, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "append" as const } },
      { question: q2.question, answer: ANSWER, mergeInto: { questionId: "q-2", mode: "append" as const } },
      { question: DEPLOY },
    ];
    const results = await saveQuestions(input, USER, CHAT);
    expect(results.map((r) => r.status)).toEqual(["merged", "failed", "saved"]);
    expect(results[1]).toMatchObject({ error: "Saving this question failed. Try it again." });
    expect(JSON.stringify(results)).not.toContain("secret-host");

    vi.clearAllMocks();
    (resolveTags as any).mockResolvedValue({ resolved: [], dropped: [] });
    (prisma.question.update as any).mockResolvedValue({ id: "q-2" });
    const firstAnswer = (await import("@/lib/questions/renderAnswer")).renderAnswerMarkdown(ANSWER);
    bank({ ...q1, answer: `${q1.answer}<hr>${firstAnswer}` }, q2);
    await saveQuestions([input[1]], USER, CHAT);
    expect(prisma.question.update).toHaveBeenCalledTimes(1);
    expect(updateArgs().where).toEqual({ id: "q-2", createdBy: USER });
  });

  it("results carry no id outside held statuses", async () => {
    (resolveTags as any).mockResolvedValue({
      resolved: [{ id: "tag-1", label: "CI/CD", created: false }],
      dropped: [],
    });
    bank(
      row({ id: "q-merge", question: "Tell me about yourself" }),
      row({ id: "q-skip", question: "Why Postgres over Mongo?" }),
      row({ id: "q-exists", question: "What is your greatest weakness?" }),
      row({ id: "q-similar", question: "How do you deal with a broken deployment?" }),
    );
    const results = await saveQuestions(
      [
        { question: "Tell me about yourself", answer: ANSWER, mergeInto: { questionId: "q-merge", mode: "append" } },
        { question: "Why Postgres over Mongo?" },
        { question: "What is your greatest weakness?", answer: ANSWER },
        { question: DEPLOY },
        { question: "Describe your ideal team", tags: ["CI/CD"] },
      ],
      USER,
      CHAT,
    );
    const byStatus = Object.fromEntries(results.map((r) => [r.status, JSON.stringify(r)]));
    expect(Object.keys(byStatus).sort()).toEqual(["exists", "merged", "saved", "similar", "skipped"]);
    for (const status of ["merged", "skipped", "saved"]) {
      expect(byStatus[status]).not.toMatch(/q-merge|q-skip|q-exists|q-similar|new-1/);
    }
    expect(byStatus.exists).toContain("q-exists");
    expect(byStatus.similar).toContain("q-similar");
  });

  it("questions in one list are not matched against each other", async () => {
    const results = await saveQuestions(
      [{ question: DEPLOY }, { question: "How do you deal with a broken deployment?" }],
      USER,
      CHAT,
    );
    expect(results.map((r) => r.status)).toEqual(["saved", "saved"]);
    expect(prisma.question.create).toHaveBeenCalledTimes(2);
  });

  it("a second merge into the same question builds on the first", async () => {
    bank(row({ id: "q-1", question: DEPLOY }));
    await saveQuestions(
      [
        { question: DEPLOY, answer: ANSWER, mergeInto: { questionId: "q-1", mode: "append" } },
        { question: "How do you deal with a broken deployment?", answer: "Then write a postmortem.", mergeInto: { questionId: "q-1", mode: "append" } },
      ],
      USER,
      CHAT,
    );
    expect(prisma.question.update).toHaveBeenCalledTimes(2);
    expect(updateArgs(1).data.answer.split("<hr>")).toHaveLength(3);
  });

  it("tags resolve only for saved or merged items", async () => {
    bank(
      row({ id: "q-skip", question: "Why Postgres over Mongo?" }),
      row({ id: "q-similar", question: "How do you deal with a broken deployment?" }),
    );
    await saveQuestions(
      [
        { question: "Why Postgres over Mongo?", tags: ["Postgres"] },
        { question: DEPLOY, tags: ["CI/CD"] },
        { question: "Why?", tags: ["Bad"] },
        { question: "Describe your ideal team", tags: ["Teamwork"] },
      ],
      USER,
      CHAT,
    );
    expect(resolveTags).toHaveBeenCalledTimes(1);
    expect(resolveTags).toHaveBeenCalledWith(["Teamwork"], USER, 10);
  });

  it("reports the duplicate and save steps", async () => {
    const steps: string[] = [];
    await saveQuestions([{ question: DEPLOY }], USER, { ...CHAT, onStep: (s) => steps.push(s) });
    expect(steps).toEqual(["duplicate", "save"]);

    steps.length = 0;
    bank(row({ id: "q-1", question: DEPLOY }));
    await saveQuestions([{ question: DEPLOY }], USER, { ...CHAT, onStep: (s) => steps.push(s) });
    expect(steps).toEqual(["duplicate"]);

    steps.length = 0;
    bank();
    await saveQuestions([{ question: DEPLOY, answer: "x".repeat(5000) }], USER, {
      ...CHAT,
      onStep: (s) => steps.push(s),
    });
    expect(steps).toEqual(["duplicate"]);
  });

  it("results are sorted by index, including repeat and invalid items", async () => {
    const results = await saveQuestions(
      [
        { question: "Why?" },
        { question: DEPLOY },
        { question: "how do you handle a failing deploy" },
        { question: "Describe your ideal team" },
      ],
      USER,
      CHAT,
    );
    expect(results.map((r) => [r.index, r.status])).toEqual([
      [1, "invalid"],
      [2, "saved"],
      [3, "repeat"],
      [4, "saved"],
    ]);
  });
});
