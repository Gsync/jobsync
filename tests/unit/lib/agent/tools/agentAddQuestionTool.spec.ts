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

  it("returns the save results unchanged", async () => {
    const tool = buildAddQuestionTool({ userId: "user-1", writer });
    expect(await execute(tool, { questions: [{ question: "Tell me about yourself" }] })).toEqual({ items });
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
});
