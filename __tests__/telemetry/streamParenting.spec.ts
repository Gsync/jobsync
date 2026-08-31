import { AsyncLocalStorage } from "node:async_hooks";
import { createUIMessageStream, stepCountIs, streamText, tool } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { z } from "zod";

// The feature's main deliverable rests on this: a tool's execute, driven by
// the consumer long after execute() returned, must still see the turn's
// ambient span. Proven with a bare ALS so it tests the AI SDK, not our code.
const als = new AsyncLocalStorage<{ spanId: string }>();

const usage = {
  inputTokens: { total: 10, noCache: 10 },
  outputTokens: { total: 5, text: 5 },
  totalTokens: 15,
} as any;

function toolCallingModel() {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "tool-input-start", id: "call-1", toolName: "nested_tool" },
          { type: "tool-input-delta", id: "call-1", delta: "{}" },
          { type: "tool-input-end", id: "call-1" },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "nested_tool",
            input: "{}",
          },
          { type: "finish", finishReason: "tool-calls", usage },
        ] as any,
        chunkDelayInMs: 1,
      }),
    }),
  });
}

async function drain(stream: ReadableStream<any>): Promise<void> {
  const reader = stream.getReader();
  while (true) {
    const { done } = await reader.read();
    if (done) break;
  }
}

describe("telemetry context propagation through createUIMessageStream", () => {
  it("a tool execute sees the ambient span established around execute()", async () => {
    let seenInTool: string | undefined = "NOT_SET";
    let seenInOnFinish: string | undefined = "NOT_SET";

    const stream = createUIMessageStream({
      execute: ({ writer }) =>
        als.run({ spanId: "turn-span" }, () => {
          const result = streamText({
            model: toolCallingModel(),
            prompt: "go",
            stopWhen: [stepCountIs(1)],
            tools: {
              nested_tool: tool({
                description: "records the ambient span",
                inputSchema: z.object({}),
                execute: async () => {
                  seenInTool = als.getStore()?.spanId;
                  return { status: "ok" };
                },
              }),
            },
            onFinish: () => {
              seenInOnFinish = als.getStore()?.spanId;
            },
          });
          writer.merge(result.toUIMessageStream());
        }),
    });

    await drain(stream);

    expect(seenInTool).toBe("turn-span");
    expect(seenInOnFinish).toBe("turn-span");
  });
});

describe("real span parenting through the stream boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("a span started inside a tool parents under the turn span", async () => {
    const { loadTelemetry, mockFetchOk } = await import("./helpers");
    mockFetchOk();
    const { span: api, otlp } = await loadTelemetry({
      endpoint: "http://homelab:5080/api/default",
    });

    const turn = api.startSpan("agent.chat.turn");
    let childParent: string | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer }) =>
        api.runInSpan(turn, () => {
          const result = streamText({
            model: toolCallingModel(),
            prompt: "go",
            stopWhen: [stepCountIs(1)],
            tools: {
              nested_tool: tool({
                description: "starts a nested span",
                inputSchema: z.object({}),
                execute: async () => {
                  const child = api.startSpan("agent.nested.review_resume");
                  childParent = turn.spanId;
                  expect(child.traceId).toBe(turn.traceId);
                  child.end();
                  return { status: "ok" };
                },
              }),
            },
          });
          writer.merge(result.toUIMessageStream());
        }),
    });

    await drain(stream);
    turn.end();

    expect(childParent).toBe(turn.spanId);
    expect(otlp.getTelemetryStats().queuedSpans).toBe(2);
  });
});
