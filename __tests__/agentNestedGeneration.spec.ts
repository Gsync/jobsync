import { runNestedGeneration } from "@/lib/agent/nestedGeneration";
import { APP_CONSTANTS } from "@/lib/constants";

const streamText = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, streamText: (...args: unknown[]) => streamText(...(args as [])) };
});

function textStreamOf(chunks: string[], finishReason: unknown = "stop") {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
    })(),
    finishReason: Promise.resolve(finishReason),
  };
}

const writer = { write: vi.fn(), merge: vi.fn(), onError: undefined };

const args = () => ({
  model: { id: "fake-model" } as any,
  system: "SYSTEM",
  prompt: "PROMPT",
  temperature: 0.4,
  numCtx: APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
  timeoutMs: 1000,
  writer: writer as any,
  toolCallId: "call-1",
  guard: { running: false },
  label: "test_tool",
});

describe("runNestedGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamText.mockReturnValue(textStreamOf(["hello ", "world"]));
  });

  it("passes the five varying inputs straight through", async () => {
    await runNestedGeneration(args());
    const call = streamText.mock.calls[0][0];
    expect(call.system).toBe("SYSTEM");
    expect(call.prompt).toBe("PROMPT");
    expect(call.temperature).toBe(0.4);
    expect(call.providerOptions.ollama.options.num_ctx).toBe(
      APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
    );
    expect(call.abortSignal).toBeDefined();
  });

  // The chat loop needs think:true; a sub-call with no tools does not.
  it("never enables the thinking channel", async () => {
    await runNestedGeneration(args());
    expect(streamText.mock.calls[0][0].providerOptions.ollama.think).toBeUndefined();
  });

  it("returns the concatenated text on a clean finish", async () => {
    const result = await runNestedGeneration(args());
    expect(result).toEqual({ status: "ok", text: "hello world" });
  });

  it("writes each delta as a transient part keyed by the tool call", async () => {
    await runNestedGeneration(args());
    expect(writer.write).toHaveBeenCalledTimes(2);
    const first = writer.write.mock.calls[0][0];
    expect(first.type).toBe("data-nested-stream");
    expect(first.id).toBe("call-1");
    expect(first.transient).toBe(true);
    expect(first.data.delta).toBe("hello ");
  });

  it.each(["other", "length"])(
    "reports incomplete when the stream ends with finishReason %s",
    async (finishReason) => {
      streamText.mockReturnValue(textStreamOf(["partial"], finishReason));
      const result = await runNestedGeneration(args());
      expect(result).toEqual({ status: "incomplete" });
    },
  );

  // A rejected finishReason throws into the catch, so an abort lands on
  // "failed", not "incomplete". Do not "fix" this to match the other case.
  it("reports failed when the sub-call is aborted", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    const rejected = Promise.reject(abortError);
    rejected.catch(() => {});
    streamText.mockReturnValue({
      textStream: (async function* () {
        yield "partial";
      })(),
      finishReason: rejected,
    });
    const result = await runNestedGeneration(args());
    expect(result).toEqual({ status: "failed" });
  });

  it("reports failed rather than throwing when the stream errors", async () => {
    streamText.mockReturnValue({
      textStream: (async function* () {
        throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
      })(),
    });
    const result = await runNestedGeneration(args());
    expect(result).toEqual({ status: "failed" });
  });

  // Two nested generations in one turn serialize on Ollama to ~360s against a
  // 300s deadline, so the second must be refused rather than started.
  it("refuses a second generation while one is already running", async () => {
    const guard = { running: true };
    const result = await runNestedGeneration({ ...args(), guard });
    expect(result).toEqual({ status: "busy" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("releases the guard so a later generation can run", async () => {
    const guard = { running: false };
    await runNestedGeneration({ ...args(), guard });
    expect(guard.running).toBe(false);
    const second = await runNestedGeneration({ ...args(), guard });
    expect(second.status).toBe("ok");
  });

  it("releases the guard even when the generation throws", async () => {
    const guard = { running: false };
    streamText.mockReturnValue({
      textStream: (async function* () {
        throw new Error("boom");
      })(),
    });
    await runNestedGeneration({ ...args(), guard });
    expect(guard.running).toBe(false);
  });
});
