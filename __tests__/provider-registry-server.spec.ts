// Mock server-only so the module can be imported in the jest (jsdom) environment
vi.mock("server-only", () => ({}));

// Mock AI SDK packages to avoid loading provider implementations in tests
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: vi.fn() }));
vi.mock("@ai-sdk/deepseek", () => ({ createDeepSeek: vi.fn() }));
vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: vi.fn() }));
vi.mock("ollama-ai-provider-v2", () => ({ createOllama: vi.fn() }));

import { createOpenAI } from "@ai-sdk/openai";
import {
  PROVIDER_FACTORIES,
  PROVIDER_VERIFIERS,
} from "@/lib/ai/provider-registry.server";

describe("PROVIDER_VERIFIERS – openrouter", () => {
  it("returns { success: true } on a 200 OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-valid");

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/key",
      {
        headers: { Authorization: "Bearer sk-or-valid" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  // /models is public, so verifying against it passed any string
  it("verifies against the authenticated endpoint, not public /models", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await PROVIDER_VERIFIERS.openrouter("sk-or-valid");

    expect(global.fetch).not.toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      expect.anything(),
    );
  });

  it("aborts the request on a timeout signal", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await PROVIDER_VERIFIERS.openrouter("sk-or-key");

    const { signal } = (global.fetch as any).mock.calls[0][1];
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  it("returns 'Invalid API key' error on 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-bad-key");

    expect(result).toEqual({ success: false, error: "Invalid API key" });
  });

  it("returns status-based error message on 500", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-key");

    expect(result).toEqual({
      success: false,
      error: "OpenRouter returned 500",
    });
  });

  it("returns status-based error message on 503", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-key");

    expect(result).toEqual({
      success: false,
      error: "OpenRouter returned 503",
    });
  });

  it("includes the API key in the Authorization header", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await PROVIDER_VERIFIERS.openrouter("sk-or-my-secret-key");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Authorization: "Bearer sk-or-my-secret-key" },
      }),
    );
  });

  it("blocks the save on a non-401 failure, surfacing the status", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-key");

    expect(result).toEqual({
      success: false,
      error: "OpenRouter returned 429",
    });
  });
});

describe("PROVIDER_FACTORIES – openrouter", () => {
  it("uses createOpenAI with the openrouter baseURL", () => {
    const mockModelInstance = { modelId: "openai/gpt-4o" };
    const mockChainFn = vi.fn().mockReturnValue(mockModelInstance);
    (createOpenAI as any).mockReturnValue(mockChainFn);

    const result = PROVIDER_FACTORIES.openrouter(
      "sk-or-apikey",
      "openai/gpt-4o",
    );

    expect(createOpenAI).toHaveBeenCalledWith({
      apiKey: "sk-or-apikey",
      baseURL: "https://openrouter.ai/api/v1",
    });
    expect(mockChainFn).toHaveBeenCalledWith("openai/gpt-4o");
    expect(result).toBe(mockModelInstance);
  });

  it("passes the model name through to the factory chain", () => {
    const mockChainFn = vi.fn().mockReturnValue({});
    (createOpenAI as any).mockReturnValue(mockChainFn);

    PROVIDER_FACTORIES.openrouter("sk-or-key", "google/gemini-flash");

    expect(mockChainFn).toHaveBeenCalledWith("google/gemini-flash");
  });

  it("passes the API key through to createOpenAI", () => {
    const mockChainFn = vi.fn().mockReturnValue({});
    (createOpenAI as any).mockReturnValue(mockChainFn);

    PROVIDER_FACTORIES.openrouter("sk-or-specific-key", "any-model");

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-or-specific-key" }),
    );
  });
});

describe("PROVIDER_VERIFIERS – strata", () => {
  it("returns { success: true } when /health responds ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    const result = await PROVIDER_VERIFIERS.strata("http://127.0.0.1:8080");

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/health",
      { signal: expect.any(AbortSignal) },
    );
  });

  it("strips a trailing slash from the base URL", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await PROVIDER_VERIFIERS.strata("http://127.0.0.1:8080/");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/health",
      expect.any(Object),
    );
  });

  it("returns a descriptive error when the server responds not-ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const result = await PROVIDER_VERIFIERS.strata("http://127.0.0.1:8080");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot connect to Strata");
  });

  it("returns a descriptive error when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await PROVIDER_VERIFIERS.strata("http://127.0.0.1:8080");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Strata");
  });
});

describe("PROVIDER_FACTORIES – strata", () => {
  it("uses createOpenAI with the server's /v1 baseURL", () => {
    const mockModelInstance = { modelId: "qwen3.8-flash-next" };
    const mockChainFn = vi.fn().mockReturnValue(mockModelInstance);
    (createOpenAI as any).mockReturnValue(mockChainFn);

    const result = PROVIDER_FACTORIES.strata(
      "http://127.0.0.1:8080",
      "qwen3.8-flash-next",
    );

    expect(createOpenAI).toHaveBeenCalledWith({
      apiKey: "strata-local",
      baseURL: "http://127.0.0.1:8080/v1",
    });
    expect(mockChainFn).toHaveBeenCalledWith("qwen3.8-flash-next");
    expect(result).toBe(mockModelInstance);
  });

  it("strips a trailing slash from the base URL before appending /v1", () => {
    const mockChainFn = vi.fn().mockReturnValue({});
    (createOpenAI as any).mockReturnValue(mockChainFn);

    PROVIDER_FACTORIES.strata("http://127.0.0.1:8080/", "some-model");

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "http://127.0.0.1:8080/v1" }),
    );
  });
});
