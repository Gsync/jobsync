import { isStepCount, simulateReadableStream, streamText, type ModelMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { addJobNeedsApproval, buildAddJobTool } from "@/lib/agent/tools/addJob";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";

vi.mock("@/lib/jobs/createJobFromNames", () => ({ createJobFromNames: vi.fn() }));

// The real SDK, not a mock of it: toolApproval takes a status, and a bare
// boolean normalizes to no status at all, so the tool would run unasked.
const usage = {
  inputTokens: { total: 10, noCache: 10 },
  outputTokens: { total: 5, text: 5 },
  totalTokens: 15,
} as any;

function addJobCallingModel(input: object) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "add_job",
            input: JSON.stringify(input),
          },
          { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
        ] as any,
      }),
    }),
  });
}

function textModel() {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "t1" },
          { type: "text-delta", id: "t1", delta: "Not added." },
          { type: "text-end", id: "t1" },
          { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
        ] as any,
      }),
    }),
  });
}

function run(model: MockLanguageModelV4, opts: { pastedText?: string; messages?: ModelMessage[] }) {
  const tool = buildAddJobTool("user-1", opts.pastedText);
  const execute = vi.fn(tool.execute!);
  const result = streamText({
    model,
    messages: opts.messages ?? [{ role: "user", content: "add this job" }],
    tools: { add_job: { ...tool, execute } },
    toolApproval: {
      add_job: (input) =>
        addJobNeedsApproval(input, opts.pastedText) ? "user-approval" : "not-applicable",
    },
    stopWhen: isStepCount(1),
  });
  return { result, execute };
}

async function chunkTypes(result: { stream: AsyncIterable<{ type: string }> }): Promise<string[]> {
  const types: string[] = [];
  for await (const part of result.stream) types.push(part.type);
  return types;
}

describe("add_job approval through the real SDK", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createJobFromNames as any).mockResolvedValue({
      created: true,
      jobId: "job-1",
      resolutions: [],
      descriptionCompleteness: "full",
      message: "",
    });
  });

  it("asks for approval and does not execute a call carrying a pasted posting", async () => {
    const { result, execute } = run(addJobCallingModel({ company: "Acme", jobTitle: "Engineer" }), {
      pastedText: "THE PASTED POSTING",
    });
    const types = await chunkTypes(result);
    expect(types).toContain("tool-approval-request");
    expect(execute).not.toHaveBeenCalled();
    expect(createJobFromNames).not.toHaveBeenCalled();
  });

  it("does not gate a call with no description anywhere", async () => {
    const { result, execute } = run(addJobCallingModel({ company: "Acme", jobTitle: "Engineer" }), {});
    const types = await chunkTypes(result);
    expect(types).not.toContain("tool-approval-request");
    expect(execute).toHaveBeenCalledTimes(1);
    // execute rejects it itself, so nothing is written.
    expect(createJobFromNames).not.toHaveBeenCalled();
  });

  it("never executes a call the user denied", async () => {
    const input = { company: "Acme", jobTitle: "Engineer", jobDescription: "a description" };
    const messages: ModelMessage[] = [
      { role: "user", content: "add this job" },
      {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "call-1", toolName: "add_job", input },
          { type: "tool-approval-request", approvalId: "appr-1", toolCallId: "call-1" },
        ],
      },
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approvalId: "appr-1", approved: false }],
      },
    ];
    const { result, execute } = run(textModel(), { messages });
    const types = await chunkTypes(result);
    expect(types).toContain("tool-output-denied");
    expect(execute).not.toHaveBeenCalled();
    expect(createJobFromNames).not.toHaveBeenCalled();
  });

  // The resume POST re-resolves toolApproval; only "denied" may block it.
  it("executes a call the user approved, exactly once", async () => {
    const input = { company: "Acme", jobTitle: "Engineer", jobDescription: "a description" };
    const messages: ModelMessage[] = [
      { role: "user", content: "add this job" },
      {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "call-1", toolName: "add_job", input },
          { type: "tool-approval-request", approvalId: "appr-1", toolCallId: "call-1" },
        ],
      },
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approvalId: "appr-1", approved: true }],
      },
    ];
    const { result, execute } = run(textModel(), { messages });
    await chunkTypes(result);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(createJobFromNames).toHaveBeenCalledTimes(1);
  });
});
