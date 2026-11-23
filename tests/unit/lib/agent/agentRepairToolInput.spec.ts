import { isStepCount, simulateReadableStream, streamText, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { repairStringifiedInput, repairTopLevelStrings } from "@/lib/agent/turn/repairToolInput";
import { AgentAddQuestionSchema } from "@/models/agent.schema";

// The input qwen3.5:9b sent live: Ollama passed an array missing its ] as text
const STRINGIFIED = {
  questions: '[{"question": "What are your strengths?", "tags": ["Strengths", "Soft skills"]}',
};
const QUESTIONS = [{ question: "What are your strengths?", tags: ["Strengths", "Soft skills"] }];

const properties = {
  questions: { type: "array" },
  mergeInto: { type: "object" },
  question: { type: "string" },
} as const;

describe("repairTopLevelStrings", () => {
  it("closes the missing bracket of a stringified array", () => {
    expect(repairTopLevelStrings(STRINGIFIED, properties)).toEqual({ questions: QUESTIONS });
  });

  it("parses a complete stringified array or object as is", () => {
    const input = { questions: JSON.stringify(QUESTIONS), mergeInto: '{"questionId": "q1", "mode": "append"}' };
    expect(repairTopLevelStrings(input, properties)).toEqual({
      questions: QUESTIONS,
      mergeInto: { questionId: "q1", mode: "append" },
    });
  });

  it("leaves string-typed fields and real arrays alone", () => {
    expect(repairTopLevelStrings({ question: "[not json", questions: QUESTIONS }, properties)).toBeNull();
  });

  it("gives up on text cut off inside a string", () => {
    expect(repairTopLevelStrings({ questions: '[{"question": "What are your stre' }, properties)).toBeNull();
  });

  it("gives up when the parsed value is not the schema's type", () => {
    expect(repairTopLevelStrings({ questions: '{"question": "x"}' }, properties)).toBeNull();
  });
});

const usage = {
  inputTokens: { total: 10, noCache: 10 },
  outputTokens: { total: 5, text: 5 },
  totalTokens: 15,
} as any;

function addQuestionCallingModel(input: object) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "tool-call", toolCallId: "call-1", toolName: "add_question", input: JSON.stringify(input) },
          { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
        ] as any,
      }),
    }),
  });
}

async function runTurn(input: object) {
  const execute = vi.fn(async () => ({ items: [] }));
  const result = streamText({
    model: addQuestionCallingModel(input),
    messages: [{ role: "user", content: "what are your strengths?" }],
    tools: { add_question: tool({ inputSchema: AgentAddQuestionSchema, execute }) },
    repairToolCall: repairStringifiedInput,
    stopWhen: isStepCount(1),
  });
  const types: string[] = [];
  for await (const part of result.stream) types.push(part.type);
  return { execute, types };
}

describe("repairStringifiedInput through the real SDK", () => {
  it("runs the tool on the repaired array in the same step", async () => {
    const { execute, types } = await runTurn(STRINGIFIED);
    expect(execute).toHaveBeenCalledWith({ questions: QUESTIONS }, expect.anything());
    expect(types).not.toContain("tool-error");
  });

  it("keeps the invalid-call path for input it cannot repair", async () => {
    const { execute, types } = await runTurn({ questions: '[{"question": "What are your stre' });
    expect(execute).not.toHaveBeenCalled();
    expect(types).toContain("tool-error");
  });
});
