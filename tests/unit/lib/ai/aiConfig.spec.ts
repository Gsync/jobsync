import { resolveAiConfig } from "@/lib/ai/aiConfig";
import type { AiSurface } from "@/lib/ai/numCtx";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ default: { userSettings: { findUnique } } }));

describe("resolveAiConfig", () => {
  it("defaults a missing settings row to Ollama", async () => {
    findUnique.mockResolvedValue(null);
    expect(await resolveAiConfig("u1", "analyze")).toStrictEqual({
      ok: true, configuredModel: undefined, config: { provider: "ollama", modelName: "qwen3.5:9b" },
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("uses the provider default unless a configured model is required", async () => {
    findUnique.mockResolvedValue({ settings: JSON.stringify({ ai: { provider: "deepseek" } }) });
    expect(await resolveAiConfig("u1", "automation_match")).toStrictEqual({
      ok: true, configuredModel: undefined, config: { provider: "deepseek", modelName: "deepseek-chat" },
    });
    expect(await resolveAiConfig("u1", "chat", { requireConfigured: true })).toEqual({
      ok: false, reason: "no_model",
    });
  });

  it.each<[AiSurface, number | undefined]>([
    ["chat", 16384], ["chat_nested", 16384], ["analyze", undefined], ["automation_match", undefined],
  ])("keeps the configured model and context size for %s", async (surface, numCtx) => {
    findUnique.mockResolvedValue({ settings: JSON.stringify({ ai: { model: "custom:latest" } }) });
    expect(await resolveAiConfig("u1", surface, { requireConfigured: true })).toStrictEqual({
      ok: true, configuredModel: "custom:latest",
      config: { provider: "ollama", modelName: "custom:latest", ...(numCtx !== undefined && { numCtx }) },
    });
  });
});
