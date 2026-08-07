import { createUIMessageStream, stepCountIs, streamText, tool } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { z } from "zod";

// The whole review design rests on this: a writer.write() issued from inside
// a tool's execute must reach the client BEFORE the tool's own result.
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
          { type: "tool-input-start", id: "call-1", toolName: "slow_tool" },
          { type: "tool-input-delta", id: "call-1", delta: "{}" },
          { type: "tool-input-end", id: "call-1" },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "slow_tool",
            input: "{}",
          },
          { type: "finish", finishReason: "tool-calls", usage },
        ] as any,
        chunkDelayInMs: 1,
      }),
    }),
  });
}

async function collect(stream: ReadableStream<any>): Promise<any[]> {
  const chunks: any[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks;
}

describe("nested generation stream plumbing", () => {
  it("flushes a transient part written inside execute before the tool result", async () => {
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        const result = streamText({
          model: toolCallingModel(),
          prompt: "go",
          stopWhen: [stepCountIs(1)],
          tools: {
            slow_tool: tool({
              description: "writes while it runs",
              inputSchema: z.object({}),
              execute: async () => {
                for (const delta of ["one ", "two ", "three"]) {
                  writer.write({
                    type: "data-review",
                    id: "call-1",
                    data: { delta },
                    transient: true,
                  });
                  await new Promise((r) => setTimeout(r, 1));
                }
                return { status: "ok" };
              },
            }),
          },
        });
        writer.merge(result.toUIMessageStream());
      },
    });

    const chunks = await collect(stream);
    const types = chunks.map((c) => c.type);
    const firstTransient = types.indexOf("data-review");
    const output = types.indexOf("tool-output-available");

    expect(firstTransient).toBeGreaterThanOrEqual(0);
    expect(output).toBeGreaterThanOrEqual(0);
    // The gate: partial text arrives while the tool is still running.
    expect(firstTransient).toBeLessThan(output);
    expect(
      chunks
        .filter((c) => c.type === "data-review")
        .map((c) => c.data.delta)
        .join(""),
    ).toBe("one two three");
  });
});
