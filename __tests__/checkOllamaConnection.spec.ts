// Unit tests for checkOllamaConnection: non-ollama short-circuit, reachable,
// unreachable, and thrown-error branches.

import { checkOllamaConnection } from "@/utils/ai.utils";
import { AiProvider } from "@/models/ai.model";

describe("checkOllamaConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connected without fetching for non-Ollama providers", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    const result = await checkOllamaConnection(AiProvider.OPENAI);

    expect(result).toEqual({ isConnected: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns connected when the tags endpoint responds ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

    const result = await checkOllamaConnection(AiProvider.OLLAMA);

    expect(result).toEqual({ isConnected: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai/ollama/tags",
      expect.any(Object),
    );
  });

  it("returns disconnected when the tags endpoint responds not-ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;

    const result = await checkOllamaConnection(AiProvider.OLLAMA);

    expect(result.isConnected).toBe(false);
    expect(result.error).toContain("not responding");
  });

  it("returns disconnected with the error message when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as any;

    const result = await checkOllamaConnection(AiProvider.OLLAMA);

    expect(result.isConnected).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });
});
