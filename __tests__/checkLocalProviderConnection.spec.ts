// Unit tests for checkLocalProviderConnection: cloud-provider short-circuit,
// reachable, unreachable, and thrown-error branches, across local providers.

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

  it("returns connected when Ollama's models endpoint responds ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

    const result = await checkLocalProviderConnection(AiProvider.OLLAMA);

    expect(result).toEqual({ isConnected: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai/ollama/tags",
      expect.any(Object),
    );
  });

  it("returns disconnected when Ollama's models endpoint responds not-ok", async () => {
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

  it("returns connected when Strata's models endpoint responds ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

    const result = await checkLocalProviderConnection(AiProvider.STRATA);

    expect(result).toEqual({ isConnected: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai/strata/models",
      expect.any(Object),
    );
  });

  it("returns disconnected when Strata's models endpoint responds not-ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;

    const result = await checkLocalProviderConnection(AiProvider.STRATA);

    expect(result.isConnected).toBe(false);
    expect(result.error).toContain("Strata");
  });
});
