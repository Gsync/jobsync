import { loadTelemetry, mockFetchOk } from "./helpers";

const ENDPOINT = "http://homelab:5080/api/default";

const writer = { write: () => {} } as any;

function stubStreamText(chunks: string[], finishReason: string) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
    })(),
    finishReason: Promise.resolve(finishReason),
    totalUsage: Promise.resolve({
      inputTokens: 7000,
      inputTokenDetails: {},
      outputTokens: 900,
      outputTokenDetails: {},
      totalTokens: 7900,
    }),
  };
}

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, streamText: vi.fn() };
});

describe("agent.nested span", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("records surface, num_ctx, usage and the caller's input sizes", async () => {
    mockFetchOk();
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });
    const { streamText } = await import("ai");
    (streamText as any).mockReturnValue(stubStreamText(["a", "b"], "stop"));
    const { runNestedGeneration } = await import("@/lib/agent/nestedGeneration");

    const result = await runNestedGeneration({
      model: {} as any,
      system: "sys",
      prompt: "resume text",
      temperature: 0.3,
      numCtx: 8192,
      timeoutMs: 1000,
      writer,
      toolCallId: "call-1",
      guard: { running: false },
      label: "review_resume",
      provider: "ollama",
      modelName: "qwen3.5:9b",
      attrs: { "jobsync.input.resume_chars": 14500 },
    });

    expect(result).toEqual({ status: "ok", text: "ab" });
    expect(otlp.getTelemetryStats().queuedSpans).toBe(1);
  });

  it("marks an incomplete generation as an error span", async () => {
    mockFetchOk();
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });
    const { streamText } = await import("ai");
    (streamText as any).mockReturnValue(stubStreamText(["a"], "length"));
    const { runNestedGeneration } = await import("@/lib/agent/nestedGeneration");

    const result = await runNestedGeneration({
      model: {} as any,
      system: "sys",
      prompt: "p",
      temperature: 0.3,
      numCtx: 8192,
      timeoutMs: 1000,
      writer,
      toolCallId: "call-1",
      guard: { running: false },
      label: "review_resume",
      provider: "ollama",
      modelName: "qwen3.5:9b",
    });

    expect(result).toEqual({ status: "incomplete" });
    expect(otlp.getTelemetryStats().queuedSpans).toBe(1);
  });

  it("still records a span when the guard rejects the call as busy", async () => {
    mockFetchOk();
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });
    const { runNestedGeneration } = await import("@/lib/agent/nestedGeneration");

    const result = await runNestedGeneration({
      model: {} as any,
      system: "sys",
      prompt: "p",
      temperature: 0.3,
      numCtx: 8192,
      timeoutMs: 1000,
      writer,
      toolCallId: "call-1",
      guard: { running: true },
      label: "match_job",
      provider: "ollama",
      modelName: "qwen3.5:9b",
    });

    expect(result).toEqual({ status: "busy" });
    expect(otlp.getTelemetryStats().queuedSpans).toBe(1);
  });
});
