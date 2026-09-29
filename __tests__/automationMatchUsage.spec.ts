const generateText = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: (...a: unknown[]) => generateText(...a) };
});
vi.mock("@/lib/ai", () => ({
  getModel: vi.fn(async () => ({ id: "m" })),
  parseJobMatch: () => ({ scores: { matchScore: 80, recommendation: "good" }, body: "" }),
  AUTOMATION_JOB_MATCH_SYSTEM_PROMPT: "SYS",
  buildAutomationJobMatchPrompt: () => "PROMPT",
  removeHtmlTags: (s: string) => s,
}));
vi.mock("@/lib/scraper/automation-run/resumeText", () => ({ convertResumeForMatch: async () => "resume" }));
vi.mock("@/lib/scraper/automation-run/aiSettings", () => ({ getDefaultModelForProvider: () => "llama3.2" }));
vi.mock("@/lib/telemetry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/telemetry")>();
  return { ...actual, log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } };
});
const finish = vi.fn();
const startAiCall = vi.fn((..._a: unknown[]) => ({ markFirstToken: vi.fn(), finish }));
vi.mock("@/lib/aiUsage/tracker", () => ({ startAiCall: (...a: unknown[]) => startAiCall(...a) }));

import { matchJobToResume } from "@/lib/scraper/automation-run/match";

const job = { title: "Dev", company: "Acme", location: "Remote", description: "d" } as any;
const run = (signal?: AbortSignal) =>
  matchJobToResume(job, {} as any, "greenhouse" as any, { provider: "ollama", model: "qwen3.5:9b" } as any, "user-1", signal);

describe("automation match usage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records an automations call with no num_ctx", async () => {
    generateText.mockResolvedValue({ text: "x", totalUsage: { inputTokens: 2000, outputTokens: 150 }, finishReason: "stop" });
    await run();
    expect(startAiCall).toHaveBeenCalledWith({ userId: "user-1", feature: "automations", provider: "ollama", model: "qwen3.5:9b" });
    expect(finish).toHaveBeenCalledWith({ usage: { inputTokens: 2000, outputTokens: 150 }, finishReason: "stop" });
  });

  it("records a provider error", async () => {
    const err = new Error("fetch failed");
    generateText.mockRejectedValue(err);
    await run();
    expect(finish).toHaveBeenCalledWith({ error: err, abortedBy: undefined });
  });

  it("passes the run's signal so a cancelled run records stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    generateText.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await run(controller.signal);
    expect(finish.mock.calls[0][0].abortedBy).toBe(controller.signal);
  });
});
