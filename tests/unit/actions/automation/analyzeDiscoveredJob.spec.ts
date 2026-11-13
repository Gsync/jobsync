import { analyzeDiscoveredJob } from "@/actions/automation/analyze";
import prisma from "@/lib/db";
import { getModel } from "@/lib/ai";
import { startAiCall } from "@/lib/aiUsage/tracker";
import { genAiRequestAttrs } from "@/lib/telemetry";

vi.mock("@/lib/db", () => ({
  default: {
    job: { findFirst: vi.fn(), update: vi.fn() },
    userSettings: { findUnique: vi.fn() },
  },
}));
vi.mock("@/actions/shared", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/actions/profile.actions", () => ({
  getResumeById: vi.fn(async () => ({ data: { title: "R" } })),
}));
vi.mock("@/actions/job.actions", () => ({
  getJobDetails: vi.fn(async () => ({ job: {} })),
}));
vi.mock("@/lib/automation-logger", () => ({
  automationLogger: { isRunning: vi.fn(() => false) },
}));
vi.mock("@/lib/ai", () => ({
  getModel: vi.fn(async () => ({ id: "m" })),
  preprocessResume: vi.fn(async () => ({ success: true, data: { normalizedText: "x" } })),
  preprocessJob: vi.fn(async () => ({ success: true, data: { normalizedText: "x" } })),
  parseJobMatch: () => ({ scores: { matchScore: 80, recommendation: "good" }, body: "" }),
  JOB_MATCH_SYSTEM_PROMPT: "SYS",
  buildJobMatchPrompt: () => "PROMPT",
}));
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn(async () => ({ text: "x", usage: {}, finishReason: "stop" })),
  };
});
vi.mock("@/lib/telemetry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/telemetry")>();
  return { ...actual, genAiRequestAttrs: vi.fn(actual.genAiRequestAttrs) };
});
vi.mock("@/lib/aiUsage/tracker", () => ({
  startAiCall: vi.fn(() => ({ finish: vi.fn() })),
}));

const db = vi.mocked(prisma, true);
const settings = (ai: Record<string, string>) => {
  db.userSettings.findUnique.mockResolvedValue({
    settings: JSON.stringify({ ai }),
  } as Awaited<ReturnType<typeof prisma.userSettings.findUnique>>);
};

beforeEach(() => {
  db.job.findFirst.mockResolvedValue({
    id: "job-1",
    automationId: "auto-1",
    matchData: null,
    automation: { resumeId: "res-1" },
  } as unknown as Awaited<ReturnType<typeof prisma.job.findFirst>>);
  db.job.update.mockResolvedValue({} as Awaited<ReturnType<typeof prisma.job.update>>);
});

describe("analyze discovered job model", () => {
  it.each([
    ["openai", "gpt-4o-mini"],
    ["deepseek", "deepseek-chat"],
    ["gemini", "gemini-2.0-flash"],
    ["openrouter", "anthropic/claude-3.5-sonnet"],
  ])("uses %s's default model when none is picked", async (provider, model) => {
    settings({ provider });
    await analyzeDiscoveredJob("job-1");
    expect(getModel).toHaveBeenCalledWith(provider, model, "user-1");
    expect(startAiCall).toHaveBeenCalledWith(expect.objectContaining({ provider, model }));
    expect(genAiRequestAttrs).toHaveBeenCalledWith(expect.objectContaining({ provider, model }));
  });

  it("treats an empty model as unset", async () => {
    settings({ provider: "openai", model: "" });
    await analyzeDiscoveredJob("job-1");
    expect(getModel).toHaveBeenCalledWith("openai", "gpt-4o-mini", "user-1");
  });

  it("keeps qwen3.5:9b for Ollama with no settings row", async () => {
    db.userSettings.findUnique.mockResolvedValue(null);
    await analyzeDiscoveredJob("job-1");
    expect(getModel).toHaveBeenCalledWith("ollama", "qwen3.5:9b", "user-1");
  });

  it("uses the picked model as-is", async () => {
    settings({ provider: "deepseek", model: "deepseek-reasoner" });
    const result = await analyzeDiscoveredJob("job-1");
    expect(getModel).toHaveBeenCalledWith("deepseek", "deepseek-reasoner", "user-1");
    expect(result).toEqual({ success: true, matchScore: 80 });
  });
});
