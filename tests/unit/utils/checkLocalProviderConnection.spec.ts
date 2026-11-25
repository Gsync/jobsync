import { checkLocalProviderConnection } from "@/utils/ai.utils";
import { AiProvider } from "@/models/ai.model";

describe("checkLocalProviderConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connected without fetching for cloud providers", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    const result = await checkLocalProviderConnection(AiProvider.OPENAI);

    expect(result).toEqual({ isConnected: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns connected when the tags endpoint responds ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

    const result = await checkLocalProviderConnection(AiProvider.OLLAMA);

    expect(result).toEqual({ isConnected: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai/ollama/tags",
      expect.any(Object),
    );
  });

  it("returns disconnected when the tags endpoint responds not-ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;

    const result = await checkLocalProviderConnection(AiProvider.OLLAMA);

    expect(result.isConnected).toBe(false);
    expect(result.error).toContain("not responding");
  });

  it("returns disconnected with the error message when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as any;

    const result = await checkLocalProviderConnection(AiProvider.OLLAMA);

    expect(result.isConnected).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("checks the saved model against the current compatible server", async () => {
    global.fetch = vi.fn(async () => Response.json({ data: [{ id: "Qwen3.5-9B-MLX-4bit" }] }));

    expect(await checkLocalProviderConnection("openai-compatible", "qwen3.5-9b-mlx")).toEqual({
      isConnected: false,
      error: 'The current server does not list "qwen3.5-9b-mlx". Select a model in Settings → AI Provider.',
    });
    expect(await checkLocalProviderConnection("openai-compatible", "Qwen3.5-9B-MLX-4bit")).toEqual({ isConnected: true });
  });

  it.each([
    [400, "No base URL is set"],
    [503, "OpenAI-compatible service is not responding. Please make sure OpenAI-compatible is running."],
  ] as const)("reports the compatible models route's %i response", async (status, error) => {
    global.fetch = vi.fn().mockResolvedValue(Response.json({ error: "No base URL is set" }, { status }));
    expect(await checkLocalProviderConnection("openai-compatible")).toEqual({ isConnected: false, error });
    expect(global.fetch).toHaveBeenCalledWith("/api/ai/openai-compatible/models", expect.any(Object));
  });
});
