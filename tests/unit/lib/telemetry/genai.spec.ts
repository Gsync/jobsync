import { loadTelemetry } from "./helpers";

const ENDPOINT = "http://homelab:5080/api/default";

const usage = {
  inputTokens: 1234,
  inputTokenDetails: {},
  outputTokens: 567,
  outputTokenDetails: {},
  totalTokens: 1801,
} as any;

describe("genai attribute mapping", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("maps request fields onto standard and jobsync attributes", async () => {
    const { genai } = await loadTelemetry({ endpoint: ENDPOINT });
    const attrs = genai.genAiRequestAttrs({
      provider: "ollama",
      model: "qwen3.5:9b",
      temperature: 0.1,
      numCtx: 16384,
      surface: genai.SURFACES.AGENT_CHAT,
    });

    expect(attrs).toEqual({
      "gen_ai.system": "ollama",
      "gen_ai.request.model": "qwen3.5:9b",
      "gen_ai.request.temperature": 0.1,
      "jobsync.surface": "agent.chat",
      "jobsync.ollama.num_ctx": 16384,
    });
  });

  it("omits prompt content unless OTEL_CAPTURE_CONTENT is on", async () => {
    const off = await loadTelemetry({ endpoint: ENDPOINT });
    const withoutContent = off.genai.genAiRequestAttrs({
      provider: "ollama",
      model: "qwen3.5:9b",
      surface: off.genai.SURFACES.RESUME_REVIEW,
      system: "you are a reviewer",
      prompt: "resume text",
    });
    expect(withoutContent["gen_ai.prompt"]).toBeUndefined();
    // Token counts and model survive with content off — that is the point of
    // the two independent stages.
    expect(withoutContent["gen_ai.request.model"]).toBe("qwen3.5:9b");

    const on = await loadTelemetry({ endpoint: ENDPOINT, captureContent: true });
    const withContent = on.genai.genAiRequestAttrs({
      provider: "ollama",
      model: "qwen3.5:9b",
      surface: on.genai.SURFACES.RESUME_REVIEW,
      system: "you are a reviewer",
      prompt: "resume text",
    });
    expect(withContent["gen_ai.prompt"]).toEqual({
      system: "you are a reviewer",
      prompt: "resume text",
    });
  });

  it("maps usage and finish reason, and gates the completion", async () => {
    const off = await loadTelemetry({ endpoint: ENDPOINT });
    const attrs = off.genai.genAiResponseAttrs({
      usage,
      finishReason: "stop",
      text: "the review",
    });
    expect(attrs).toEqual({
      "gen_ai.usage.input_tokens": 1234,
      "gen_ai.usage.output_tokens": 567,
      "gen_ai.usage.total_tokens": 1801,
      "gen_ai.response.finish_reasons": "stop",
    });

    const on = await loadTelemetry({ endpoint: ENDPOINT, captureContent: true });
    expect(
      on.genai.genAiResponseAttrs({ usage, finishReason: "stop", text: "the review" })[
        "gen_ai.completion"
      ],
    ).toBe("the review");
  });

  it("omits usage keys entirely when the provider returned none", async () => {
    const { genai } = await loadTelemetry({ endpoint: ENDPOINT });
    expect(genai.genAiResponseAttrs({ finishReason: "error" })).toEqual({
      "gen_ai.response.finish_reasons": "error",
    });
  });

  it("reports input sizes and the call site's own truncation flag", async () => {
    const { genai } = await loadTelemetry({ endpoint: ENDPOINT });
    expect(
      genai.inputSizeAttrs({ resumeChars: 14_500, jobChars: 3_200, truncated: true }),
    ).toEqual({
      "jobsync.input.resume_chars": 14_500,
      "jobsync.input.job_chars": 3_200,
      "jobsync.input.truncated": true,
    });
  });
});
