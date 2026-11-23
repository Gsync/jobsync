import { decideQuestion, prepareQuestions, type PreparedQuestion } from "@/lib/questions/decide";
import { matchQuestion } from "@/lib/questions/similarity";
import type { BankQuestion } from "@/models/question.model";

const row = (overrides: Partial<BankQuestion> & { id: string; question: string }): BankQuestion => ({
  answer: "<p>Saved answer</p>",
  createdVia: null,
  tags: [],
  ...overrides,
});

const item = (overrides: Partial<PreparedQuestion> = {}): PreparedQuestion => ({
  index: 1,
  question: "How do you handle a failing deploy?",
  answers: [],
  tags: [],
  ...overrides,
});

const MCP = { replaceAgentCreatedOnly: true };
const UNRESTRICTED = { replaceAgentCreatedOnly: false };

describe("prepareQuestions", () => {
  it("fails only the item with a short answer", () => {
    const { prepared, results } = prepareQuestions([
      { question: "Tell me about yourself", answer: "I build web apps for a living." },
      { question: "How do you cache reads?", answer: "Use Redis" },
      { question: "Why Postgres over Mongo?" },
    ]);
    expect(prepared.map((p) => p.index)).toEqual([1, 3]);
    expect(results).toEqual([
      expect.objectContaining({
        index: 2,
        status: "invalid",
        error: "answer must be at least 10 characters",
        userFacing: true,
      }),
    ]);
  });

  it.each(["", "   ", "TBD", "<p>tbd</p>"])("treats answer %j as no answer", (answer) => {
    const { prepared, results } = prepareQuestions([{ question: "Tell me about yourself", answer }]);
    expect(results).toEqual([]);
    expect(prepared[0].answers).toEqual([]);
  });

  it("strips NUL from the question", () => {
    const { prepared } = prepareQuestions([{ question: "Tell me\u0000 about yourself" }]);
    expect(prepared[0].question).not.toContain("\u0000");
  });

  it.each(["Why?", "x".repeat(501)])("rejects a question of length %#", (question) => {
    const { prepared, results } = prepareQuestions([{ question }]);
    expect(prepared).toEqual([]);
    expect(results[0]).toMatchObject({ index: 1, status: "invalid" });
  });

  it("rejects an answer over the limit", () => {
    const { results } = prepareQuestions([
      { question: "Tell me about yourself", answer: "x".repeat(5001) },
    ]);
    expect(results[0]).toMatchObject({ status: "invalid", error: "answer cannot exceed 5000 characters" });
  });

  it("folds a repeat into its first copy with both answers and tags", () => {
    const { prepared, results } = prepareQuestions([
      { question: "Tell me about yourself", answer: "First answer here.", tags: ["A"] },
      { question: "tell me about yourself?", answer: "Second answer here.", tags: ["B"] },
    ]);
    expect(prepared).toEqual([
      expect.objectContaining({
        index: 1,
        question: "Tell me about yourself",
        answers: ["First answer here.", "Second answer here."],
        tags: ["A", "B"],
      }),
    ]);
    expect(results).toEqual([
      { index: 2, question: "tell me about yourself?", status: "repeat", of: 1 },
    ]);
  });

  it("does not fold C++ and C#", () => {
    const { prepared } = prepareQuestions([
      { question: "How does C++ manage memory?" },
      { question: "How does C# manage memory?" },
    ]);
    expect(prepared).toHaveLength(2);
  });
});

describe("decideQuestion", () => {
  const deploy = row({ id: "q-deploy", question: "How do you deal with a broken deployment?" });
  const exactRow = row({ id: "q-exact", question: "How do you handle a failing deploy?" });

  it("rejects notSameAs together with mergeInto", () => {
    const decision = decideQuestion(
      item({ answers: ["Roll back first."], notSameAs: ["q-deploy"], mergeInto: { questionId: "q-deploy", mode: "append" } }),
      matchQuestion(item().question, [deploy]),
      UNRESTRICTED,
    );
    expect(decision).toMatchObject({ kind: "result", result: { status: "invalid" } });
  });

  it("rejects mergeInto without an answer", () => {
    const decision = decideQuestion(
      item({ mergeInto: { questionId: "q-deploy", mode: "append" } }),
      matchQuestion(item().question, [deploy]),
      UNRESTRICTED,
    );
    expect(decision).toMatchObject({ kind: "result", result: { status: "invalid" } });
  });

  it("leaves protocol errors unmarked for the user", () => {
    const decision = decideQuestion(
      item({ answers: ["Roll back first."], mergeInto: { questionId: "other-user-q", mode: "append" } }),
      matchQuestion(item().question, [exactRow, deploy]),
      UNRESTRICTED,
    );
    expect(decision).toMatchObject({ kind: "result", result: { status: "invalid" } });
    expect(decision).not.toHaveProperty("result.userFacing");
  });

  it("rejects a mergeInto id outside the match set without naming any id", () => {
    const decision = decideQuestion(
      item({ answers: ["Roll back first."], mergeInto: { questionId: "other-user-q", mode: "append" } }),
      matchQuestion(item().question, [exactRow, deploy]),
      UNRESTRICTED,
    );
    expect(decision).toMatchObject({
      kind: "result",
      result: {
        status: "invalid",
        error: "That question id does not match this question. Send it again without mergeInto to see its matches.",
      },
    });
    const json = JSON.stringify(decision);
    expect(json).not.toContain("q-exact");
    expect(json).not.toContain("q-deploy");
  });

  it("rejects replace on an unanswered target", () => {
    const unanswered = row({ ...deploy, answer: "<p>TBD</p>" });
    const decision = decideQuestion(
      item({ answers: ["Roll back first."], mergeInto: { questionId: "q-deploy", mode: "replace" } }),
      matchQuestion(item().question, [unanswered]),
      UNRESTRICTED,
    );
    expect(decision).toMatchObject({
      kind: "result",
      result: { status: "invalid", error: "This question has no saved answer to replace. Your answer can be added as its first answer instead.", appendOnly: true, userFacing: true },
    });
  });

  it("refuses MCP replace on an app-created question as append-only", () => {
    const decision = decideQuestion(
      item({ answers: ["Roll back first."], mergeInto: { questionId: "q-deploy", mode: "replace" } }),
      matchQuestion(item().question, [deploy]),
      MCP,
    );
    expect(decision).toMatchObject({
      kind: "result",
      result: {
        status: "invalid",
        appendOnly: true,
        userFacing: true,
        error: "Only an answer added below the saved one is allowed for this app-created question.",
      },
    });
  });

  it("allows MCP replace on an agent-created question", () => {
    const agentRow = row({ ...deploy, createdVia: "Claude Desktop" });
    const decision = decideQuestion(
      item({ answers: ["Roll back first."], mergeInto: { questionId: "q-deploy", mode: "replace" } }),
      matchQuestion(item().question, [agentRow]),
      MCP,
    );
    expect(decision).toEqual({ kind: "merge", target: agentRow, mode: "replace" });
  });

  it("allows chat replace on an app-created question", () => {
    const decision = decideQuestion(
      item({ answers: ["Roll back first."], mergeInto: { questionId: "q-deploy", mode: "replace" } }),
      matchQuestion(item().question, [deploy]),
      UNRESTRICTED,
    );
    expect(decision).toEqual({ kind: "merge", target: deploy, mode: "replace" });
  });

  it("merges into the exact match", () => {
    const decision = decideQuestion(
      item({ answers: ["Roll back first."], mergeInto: { questionId: "q-exact", mode: "append" } }),
      matchQuestion(item().question, [exactRow]),
      UNRESTRICTED,
    );
    expect(decision).toEqual({ kind: "merge", target: exactRow, mode: "append" });
  });

  it("holds an answered exact match as exists", () => {
    const decision = decideQuestion(
      item({ answers: ["Roll back first."] }),
      matchQuestion(item().question, [exactRow]),
      UNRESTRICTED,
    );
    expect(decision).toEqual({
      kind: "result",
      result: {
        index: 1,
        question: item().question,
        status: "exists",
        existing: { id: "q-exact", question: exactRow.question, hasAnswer: true, canReplace: true },
      },
    });
  });

  it("skips an exact match even with notSameAs naming it", () => {
    const decision = decideQuestion(
      item({ notSameAs: ["q-exact"] }),
      matchQuestion(item().question, [exactRow]),
      UNRESTRICTED,
    );
    expect(decision).toEqual({
      kind: "result",
      result: { index: 1, question: item().question, status: "skipped", existing: { question: exactRow.question } },
    });
  });

  it("inserts with no candidates", () => {
    expect(decideQuestion(item(), matchQuestion(item().question, []), UNRESTRICTED)).toEqual({ kind: "insert" });
  });

  it("holds a near match as similar", () => {
    const decision = decideQuestion(item(), matchQuestion(item().question, [deploy]), UNRESTRICTED);
    expect(decision).toMatchObject({
      kind: "result",
      result: { status: "similar", candidates: [expect.objectContaining({ id: "q-deploy" })] },
    });
  });

  it("inserts when notSameAs covers every candidate", () => {
    const decision = decideQuestion(
      item({ notSameAs: ["q-deploy"] }),
      matchQuestion(item().question, [deploy]),
      UNRESTRICTED,
    );
    expect(decision).toEqual({ kind: "insert" });
  });

  it("holds again when notSameAs misses a candidate", () => {
    const bank = [
      deploy,
      row({ id: "q-build", question: "How do you handle a failing build?" }),
      row({ id: "q-test", question: "How do you handle a failing test?" }),
    ];
    const decision = decideQuestion(
      item({ notSameAs: ["q-deploy", "q-build"] }),
      matchQuestion(item().question, bank),
      UNRESTRICTED,
    );
    expect(decision).toMatchObject({ kind: "result", result: { status: "similar" } });
  });

  describe("canReplace", () => {
    const TBD = "<p>TBD</p>";
    const targets = [
      { name: "unanswered, created in app", answer: TBD, createdVia: null, restricted: false, unrestricted: false },
      { name: "unanswered, created by agent", answer: TBD, createdVia: "Claude Desktop", restricted: false, unrestricted: false },
      { name: "answered, created in app", answer: "<p>Saved answer</p>", createdVia: null, restricted: false, unrestricted: true },
      { name: "answered, created by agent", answer: "<p>Saved answer</p>", createdVia: "chat", restricted: true, unrestricted: true },
    ];

    it.each(targets)("exists target $name", ({ answer, createdVia, restricted, unrestricted }) => {
      const target = row({ ...exactRow, answer, createdVia });
      const decide = (options: { replaceAgentCreatedOnly: boolean }) =>
        decideQuestion(item({ answers: ["Roll back first."] }), matchQuestion(item().question, [target]), options);
      expect(decide(MCP)).toMatchObject({ result: { status: "exists", existing: { canReplace: restricted } } });
      expect(decide(UNRESTRICTED)).toMatchObject({ result: { status: "exists", existing: { canReplace: unrestricted } } });
    });

    it.each(targets)("similar target $name", ({ answer, createdVia, restricted, unrestricted }) => {
      const target = row({ ...deploy, answer, createdVia });
      const decide = (options: { replaceAgentCreatedOnly: boolean }) =>
        decideQuestion(item({ answers: ["Roll back first."] }), matchQuestion(item().question, [target]), options);
      expect(decide(MCP)).toMatchObject({ result: { status: "similar", candidates: [{ canReplace: restricted }] } });
      expect(decide(UNRESTRICTED)).toMatchObject({ result: { status: "similar", candidates: [{ canReplace: unrestricted }] } });
    });

    it("judges each candidate in a mixed list on its own", () => {
      const bank = [
        row({ id: "q-app", question: "How do you deal with a failing deploy?" }),
        row({ id: "q-agent", question: "How do you handle a failing deployment?", createdVia: "chat" }),
        row({ id: "q-blank", question: "How do you handle a broken deploy?", answer: TBD, createdVia: "chat" }),
      ];
      const decision = decideQuestion(item({ answers: ["Roll back first."] }), matchQuestion(item().question, bank), MCP);
      if (decision.kind !== "result" || decision.result.status !== "similar") throw new Error("expected similar");
      const byId = Object.fromEntries(decision.result.candidates.map((c) => [c.id, c.canReplace]));
      expect(byId).toEqual({ "q-app": false, "q-agent": true, "q-blank": false });
    });

    it("refuses a restricted Replace on an app-created answered match as append-only", () => {
      const decision = decideQuestion(
        item({ answers: ["Roll back first."], mergeInto: { questionId: "q-exact", mode: "replace" } }),
        matchQuestion(item().question, [exactRow]),
        MCP,
      );
      expect(decision).toMatchObject({ kind: "result", result: { status: "invalid", appendOnly: true } });
    });
  });

  it.each([
    { answers: ["Roll back first."], hasIncomingAnswer: true },
    { answers: [], hasIncomingAnswer: false },
  ])("a similar result reports hasIncomingAnswer $hasIncomingAnswer", ({ answers, hasIncomingAnswer }) => {
    const decision = decideQuestion(item({ answers }), matchQuestion(item().question, [deploy]), MCP);
    expect(decision).toMatchObject({ result: { status: "similar", hasIncomingAnswer } });
  });
});
