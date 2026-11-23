import { handleAddQuestion } from "@/lib/mcp/tools/addQuestion";
import { saveQuestions } from "@/lib/questions/saveQuestions";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import type { SaveQuestionResult } from "@/models/question.model";

vi.mock("@/lib/questions/saveQuestions", () => ({ saveQuestions: vi.fn() }));

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const input = {
  question: "How do you handle a failing deploy?",
  answer: "Roll back first, then read the logs.",
  tags: ["DevOps"],
};

const base = { index: 1, question: input.question };

function mockResult(result: SaveQuestionResult) {
  vi.mocked(saveQuestions).mockResolvedValue([result]);
}

async function proseFor(result: SaveQuestionResult) {
  mockResult(result);
  const out = await handleAddQuestion(input, "user-1", "Claude Desktop");
  return out.content[0].text;
}

describe("handleAddQuestion", () => {
  beforeEach(() => {
    vi.mocked(checkMcpRateLimit).mockReturnValue({ allowed: true, remaining: 99, resetIn: 0 });
  });

  it("sends the one question to saveQuestions with the token name and the MCP replace rule", async () => {
    mockResult({ ...base, status: "saved", tags: [], droppedTags: [] });
    await handleAddQuestion(input, "user-1", "Claude Desktop");
    expect(saveQuestions).toHaveBeenCalledWith([input], "user-1", {
      createdVia: "Claude Desktop",
      replaceAgentCreatedOnly: true,
    });
  });

  it("passes a question with no answer through unchanged", async () => {
    mockResult({ ...base, status: "saved", tags: [], droppedTags: [] });
    const noAnswer = { question: input.question };
    await handleAddQuestion(noAnswer, "user-1", "Claude Desktop");
    expect(vi.mocked(saveQuestions).mock.calls[0][0]).toEqual([noAnswer]);
  });

  it("returns the result as structuredContent", async () => {
    const result: SaveQuestionResult = {
      ...base,
      status: "similar",
      candidates: [{ id: "q-9", question: "How do you deal with a broken deployment?", score: 0.28, hasAnswer: true, canReplace: true }],
      hasIncomingAnswer: true,
    };
    mockResult(result);
    const out = await handleAddQuestion(input, "user-1", "Claude Desktop");
    expect(out.structuredContent).toEqual(result);
  });

  it("reports a save with its tags and no id", async () => {
    const text = await proseFor({
      ...base,
      status: "saved",
      tags: [
        { id: "t-1", label: "DevOps", created: true },
        { id: "t-2", label: "Incidents", created: false },
      ],
      droppedTags: ["Extra"],
    });
    expect(text).toContain("Created DevOps; Matched Incidents.");
    expect(text).toContain("Question created.");
    expect(text).toContain("Dropped tags exceeding limit: Extra.");
    expect(text).not.toContain("id:");
    expect(text).not.toContain("t-1");
  });

  describe("names the stored question and what the merge did", () => {
    const stored = "How do you deal with a broken deployment?";
    const merged = (mode: "append" | "replace", hadAnswer: boolean): SaveQuestionResult =>
      ({ ...base, status: "merged", mode, savedQuestion: stored, hadAnswer, tags: [], droppedTags: [] });

    it("append onto an unanswered question", async () => {
      const text = await proseFor(merged("append", false));
      expect(text).toContain(`Merged (append): added the answer as the first answer of "${stored}".`);
    });

    it("append below a saved answer", async () => {
      const text = await proseFor(merged("append", true));
      expect(text).toContain(`Merged (append): added the answer below the saved answer of "${stored}".`);
    });

    it("replace", async () => {
      const text = await proseFor(merged("replace", true));
      expect(text).toContain(`Merged (replace): replaced the saved answer of "${stored}".`);
    });

    it("never calls the incoming wording the saved question", async () => {
      const text = await proseFor(merged("append", true));
      expect(text).not.toContain(`"${base.question}"`);
      expect(text).toContain("The saved question keeps its wording.");
    });
  });

  it("says a skipped question is already in the bank", async () => {
    const text = await proseFor({ ...base, status: "skipped", existing: { question: input.question } });
    expect(text).toMatch(/already in the question bank/i);
    expect(text).toMatch(/nothing was saved/i);
  });

  it("asks for a mergeInto re-call on an exact match with an answer", async () => {
    const text = await proseFor({
      ...base,
      status: "exists",
      existing: { id: "q-1", question: input.question, hasAnswer: true, canReplace: true },
    });
    expect(text).toContain("q-1");
    expect(text).toContain("mergeInto");
    expect(text).toMatch(/replace/);
  });

  it("offers add below or skip, never replace, on an app-created answered exact match", async () => {
    const text = await proseFor({
      ...base,
      status: "exists",
      existing: { id: "q-1", question: input.question, hasAnswer: true, canReplace: false },
    });
    expect(text).toMatch(/add their answer below the saved one or skip it/);
    expect(text).toContain('mode: "append" }');
    expect(text).not.toMatch(/replace/);
  });

  it("offers only append when the exact match has no answer", async () => {
    const text = await proseFor({
      ...base,
      status: "exists",
      existing: { id: "q-1", question: input.question, hasAnswer: false, canReplace: false },
    });
    expect(text).toContain("mergeInto");
    expect(text).not.toMatch(/replace/);
  });

  it("lists every similar candidate and how to re-call", async () => {
    const text = await proseFor({
      ...base,
      status: "similar",
      candidates: [
        { id: "q-7", question: "How do you deal with a broken deployment?", score: 0.28, hasAnswer: true, canReplace: true },
        { id: "q-8", question: "How do you handle a failed release?", score: 0.26, hasAnswer: false, canReplace: false },
      ],
      hasIncomingAnswer: true,
    });
    expect(text).toContain("q-7");
    expect(text).toContain("How do you deal with a broken deployment?");
    expect(text).toContain("q-8");
    expect(text).toContain("mergeInto");
    expect(text).toContain("notSameAs");
  });

  it("lists each candidate's own choices", async () => {
    const text = await proseFor({
      ...base,
      status: "similar",
      candidates: [
        { id: "q-7", question: "How do you deal with a broken deployment?", score: 0.28, hasAnswer: true, canReplace: true },
        { id: "q-8", question: "How do you handle a failed release?", score: 0.26, hasAnswer: false, canReplace: false },
        { id: "q-9", question: "How do you handle a failed deploy?", score: 0.3, hasAnswer: true, canReplace: false },
      ],
      hasIncomingAnswer: true,
    });
    const line = (id: string) => text.split("\n").find((l) => l.includes(`id ${id}:`)) ?? "";
    expect(line("q-7")).toContain("choices: add below the saved answer, replace the saved answer");
    expect(line("q-8")).toContain("choices: add your answer");
    expect(line("q-8")).not.toContain("replace");
    expect(line("q-9")).toContain("choices: add below the saved answer");
    expect(line("q-9")).not.toContain("replace");
  });

  it("offers only save as new or skip for a similar question without an answer", async () => {
    const text = await proseFor({
      ...base,
      status: "similar",
      candidates: [{ id: "q-7", question: "How do you deal with a broken deployment?", score: 0.28, hasAnswer: true, canReplace: true }],
      hasIncomingAnswer: false,
    });
    expect(text).toContain("offer only to save it as new or skip it");
    expect(text).toContain("notSameAs");
    expect(text).not.toContain("mergeInto");
    expect(text).not.toContain("choices:");
  });

  it("names the item a repeat folded into", async () => {
    const text = await proseFor({ ...base, index: 3, status: "repeat", of: 1 });
    expect(text).toContain("#1");
  });

  it("reports an invalid item with its error and the append-only rule", async () => {
    const text = await proseFor({
      ...base,
      status: "invalid",
      error: "Only an answer added below the saved one is allowed for this app-created question.",
      appendOnly: true,
    });
    expect(text).toContain("Not saved: Only an answer added below the saved one is allowed for this app-created question.");
    expect(text).toContain("Explain this reason to the user");
  });

  it("tells the caller how to re-call after a refused replace", async () => {
    const text = await proseFor({
      ...base,
      status: "invalid",
      error: "Only an answer added below the saved one is allowed for this app-created question.",
      appendOnly: true,
    });
    expect(text).toMatch(/ask whether to add their answer instead/i);
    expect(text).toMatch(/wait for their reply/i);
    expect(text).toContain('mode: "append"');
    expect(text).toMatch(/same question and answer/);
  });

  it("reports a failed item with its error", async () => {
    const text = await proseFor({ ...base, status: "failed", error: "Saving this question failed. Try it again." });
    expect(text).toBe("Not saved: Saving this question failed. Try it again.");
  });

  it("does not save when the rate limit is exceeded", async () => {
    vi.mocked(checkMcpRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetIn: 30_000 });
    const out = await handleAddQuestion(input, "user-1", "Claude Desktop");
    expect(saveQuestions).not.toHaveBeenCalled();
    expect(out.content[0].text).toBe("Rate limit exceeded. Try again in 30s.");
  });

  it("reports a thrown error as before", async () => {
    vi.mocked(saveQuestions).mockRejectedValue(new Error("boom"));
    const out = await handleAddQuestion(input, "user-1", "Claude Desktop");
    expect(out.content[0].text).toBe("Error: boom");
  });
});
