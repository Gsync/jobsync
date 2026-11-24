import { runTrackedGeneration } from "@/lib/ai/trackedGeneration";
import { statusOf } from "@/lib/aiUsage/tracker";
import { SURFACES } from "@/lib/telemetry";

const { generateText, startAiCall, finish, withSpan, setAttrs } = vi.hoisted(() => {
  const finish = vi.fn();
  const setAttrs = vi.fn();
  return {
    generateText: vi.fn(),
    startAiCall: vi.fn(() => ({ finish })),
    finish,
    withSpan: vi.fn((_name, _attrs, run) => run({ setAttrs })),
    setAttrs,
  };
});

vi.mock("ai", () => ({ generateText }));
vi.mock("@/lib/db", () => ({ default: {} }));
vi.mock("@/lib/aiUsage/tracker", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/aiUsage/tracker")>(),
  startAiCall,
}));
vi.mock("@/lib/telemetry", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/telemetry")>(),
  withSpan,
}));

const input = {
  userId: "user-1",
  feature: "automations",
  spanName: "scraper.match",
  surface: SURFACES.AUTOMATION_MATCH,
  ai: { provider: "ollama", modelName: "local", model: "test/model" },
  system: "instructions",
  prompt: "posting",
  temperature: 0.3,
  attrs: { "jobsync.job_board": "greenhouse" },
} as const;
const result = { text: "match", usage: { inputTokens: 12 }, finishReason: "stop" };

it("returns the generation and records its usage once with the provider's default context", async () => {
  generateText.mockResolvedValueOnce(result);
  const abortSignal = new AbortController().signal;
  await expect(runTrackedGeneration({ ...input, abortSignal })).resolves.toEqual(result);
  expect(generateText.mock.calls[0][0]).toStrictEqual({
    model: input.ai.model, instructions: input.system, prompt: input.prompt,
    temperature: input.temperature, abortSignal,
    providerOptions: { openaiCompatible: { chat_template_kwargs: { enable_thinking: false } } },
  });
  expect(startAiCall).toHaveBeenCalledExactlyOnceWith({
    userId: input.userId, feature: input.feature, provider: "ollama", model: "local",
  });
  expect(finish).toHaveBeenCalledExactlyOnceWith({
    usage: result.usage, finishReason: result.finishReason, abortedBy: abortSignal,
  });
  const [name, attrs] = withSpan.mock.calls[0];
  expect(name).toBe(input.spanName);
  expect(attrs).toMatchObject({ ...input.attrs, "jobsync.surface": input.surface });
  expect(attrs).not.toHaveProperty("jobsync.ollama.num_ctx");
  expect(setAttrs).toHaveBeenCalledWith(expect.objectContaining({
    "gen_ai.usage.input_tokens": 12, "gen_ai.response.finish_reasons": "stop",
  }));
});

it("sends and records an explicit Ollama context size", async () => {
  generateText.mockResolvedValueOnce(result);
  await runTrackedGeneration({ ...input, ai: { ...input.ai, numCtx: 4096 } });
  expect(generateText.mock.calls[0][0].providerOptions).toEqual({
    ollama: { options: { num_ctx: 4096 } },
    openaiCompatible: { chat_template_kwargs: { enable_thinking: false } },
  });
  expect(startAiCall).toHaveBeenCalledWith(expect.objectContaining({ numCtx: 4096 }));
  expect(withSpan.mock.calls[0][1]["jobsync.ollama.num_ctx"]).toBe(4096);
});

it("records a provider failure once and rethrows the original error", async () => {
  const error = new Error("provider failed");
  generateText.mockRejectedValueOnce(error);
  await expect(runTrackedGeneration(input)).rejects.toBe(error);
  expect(finish).toHaveBeenCalledExactlyOnceWith({ error, abortedBy: undefined });
});

it("classifies a cancelled generation as stopped", async () => {
  const abortSignal = AbortSignal.abort();
  generateText.mockRejectedValueOnce(abortSignal.reason);
  await expect(runTrackedGeneration({ ...input, abortSignal })).rejects.toBe(abortSignal.reason);
  expect(finish).toHaveBeenCalledExactlyOnceWith({ error: abortSignal.reason, abortedBy: abortSignal });
  expect(statusOf(finish.mock.calls[0][0])).toBe("stopped");
});
