import { buildAddQuestionTool } from "@/lib/agent/tools/addQuestion";
import { saveQuestions } from "@/lib/questions/saveQuestions";
import type { SaveQuestionResult } from "@/models/question.model";

vi.mock("@/lib/questions/saveQuestions", () => ({ saveQuestions: vi.fn() }));

const writer = { write: vi.fn(), merge: vi.fn(), onError: undefined } as any;
const execute = (tool: any, input: any) => tool.execute(input, { toolCallId: "c", messages: [] });

const items: SaveQuestionResult[] = [
  { index: 1, question: "Tell me about yourself", status: "saved", tags: [], droppedTags: [] },
];

describe("add_question agent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (saveQuestions as any).mockResolvedValue(items);
  });

  // Replace overwrites an answer without a card, so an injected paste could
  // otherwise talk the model into wiping one the user wrote in the app
  it("saves under the session user, never a userId from the model's input, and replaces only agent-created questions", async () => {
    const tool = buildAddQuestionTool({ userId: "user-1", writer });
    await execute(tool, { questions: [{ question: "Tell me about yourself", userId: "attacker" }] });
    expect(saveQuestions).toHaveBeenCalledWith(expect.any(Array), "user-1", {
      createdVia: "chat",
      replaceAgentCreatedOnly: true,
      onStep: expect.any(Function),
    });
  });

  it("returns the save results, each marked saved", async () => {
    const tool = buildAddQuestionTool({ userId: "user-1", writer });
    expect(await execute(tool, { questions: [{ question: "Tell me about yourself" }] }))
      .toEqual({ items: [{ ...items[0], saved: true }] });
  });

  it("marks a repeat like the item it folded into", async () => {
    (saveQuestions as any).mockResolvedValue([...items, { index: 2, question: "tell me about yourself", status: "repeat", of: 1 }]);
    const output = await execute(buildAddQuestionTool({ userId: "user-1", writer }), { questions: [{ question: "x" }] });
    expect(output.items.map((item: any) => item.saved)).toEqual([true, true]);
    expect(output.note).toBeUndefined();
  });

  // qwen read a held result as a save and told the user it was saved
  it("marks held and failed items not saved and says so in a note", async () => {
    const mixed: SaveQuestionResult[] = [
      ...items,
      { index: 2, question: "Why leave?", status: "similar", candidates: [] },
      { index: 3, question: "Why Postgres?", status: "skipped", existing: { question: "Why Postgres?" } },
      { index: 4, question: "Hi?", status: "invalid", error: "Too short." },
    ];
    (saveQuestions as any).mockResolvedValue(mixed);
    const output = await execute(buildAddQuestionTool({ userId: "user-1", writer }), { questions: [{ question: "x" }] });
    expect(output.items.map((item: any) => item.saved)).toEqual([true, false, false, false]);
    expect(output.note).toBe(
      "Saved: 1. Not saved yet: 1. Already in the bank, nothing written: 1. Not saved: 1.",
    );
  });

  it("returns a fixed error that never echoes the thrown message", async () => {
    (saveQuestions as any).mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5"));
    const tool = buildAddQuestionTool({ userId: "user-1", writer });
    const output = await execute(tool, { questions: [{ question: "Tell me about yourself" }] });
    expect(output).toEqual({
      items: [],
      error: "Saving the questions failed. Try again, or add them from the Questions page.",
    });
    expect(JSON.stringify(output)).not.toContain("ECONNREFUSED");
  });

  it("writes a progress part for each step saveQuestions reports", async () => {
    (saveQuestions as any).mockImplementation(async (_items: unknown, _user: string, options: any) => {
      options.onStep("duplicate");
      return items;
    });
    await execute(buildAddQuestionTool({ userId: "user-1", writer }), { questions: [{ question: "Tell me about yourself" }] });
    expect(writer.write).toHaveBeenCalledWith({
      type: "data-tool-progress",
      id: "c",
      data: { steps: ["duplicate"] },
    });
  });

  describe("cut-off paste", () => {
    const questions = [{ question: "Tell me about yourself" }, { question: "Why this company?" }];
    const dump = "1. Tell me about yourself.\n2. Why this company?\n".padEnd(3400, "x");

    it("reports how much of a long paste was read, up to the last question sent", async () => {
      const tool = buildAddQuestionTool({ userId: "user-1", pastedText: dump, writer });
      const result = await execute(tool, { questions });
      expect(result.paste).toEqual({ readChars: 2000, totalChars: 3400, lastQuestion: "Why this company?" });
    });

    it.each([["a short paste", "x".repeat(1500)], ["no paste", undefined]])(
      "reports nothing for %s", async (_label, pastedText) => {
        const tool = buildAddQuestionTool({ userId: "user-1", pastedText, writer });
        expect((await execute(tool, { questions })).paste).toBeUndefined();
      },
    );

    // A same-turn re-call would otherwise show a second, different cut-off note
    it("reports the cut-off on the first call of the request only", async () => {
      const tool = buildAddQuestionTool({ userId: "user-1", pastedText: dump, writer });
      expect((await execute(tool, { questions })).paste).toBeDefined();
      expect((await execute(tool, { questions: [questions[0]] })).paste).toBeUndefined();
    });

    // An older posting chip is still live when the user types a question
    it("reports nothing when no sent question came from the paste", async () => {
      const tool = buildAddQuestionTool({ userId: "user-1", pastedText: "x".repeat(3400), writer });
      expect((await execute(tool, { questions: [{ question: "Why Acme?" }] })).paste).toBeUndefined();
    });

    it("reports the cut-off on a later call that drew on the paste", async () => {
      const tool = buildAddQuestionTool({ userId: "user-1", pastedText: dump, writer });
      expect((await execute(tool, { questions: [{ question: "Why Acme?" }] })).paste).toBeUndefined();
      expect((await execute(tool, { questions })).paste).toBeDefined();
    });

    it("reports the cut-off on an error result too", async () => {
      (saveQuestions as any).mockRejectedValue(new Error("db down"));
      const tool = buildAddQuestionTool({ userId: "user-1", pastedText: dump, writer });
      expect((await execute(tool, { questions })).paste).toEqual({
        readChars: 2000, totalChars: 3400, lastQuestion: "Why this company?",
      });
    });
  });
});
