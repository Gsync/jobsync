// Mock server-only so the module can be imported in the jest (jsdom) environment
jest.mock("server-only", () => ({}));

// Mock AI SDK packages to avoid loading provider implementations in tests
jest.mock("@ai-sdk/openai", () => ({ createOpenAI: jest.fn() }));
jest.mock("@ai-sdk/deepseek", () => ({ createDeepSeek: jest.fn() }));
jest.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: jest.fn() }));
jest.mock("ollama-ai-provider-v2", () => ({ createOllama: jest.fn() }));

import { createOpenAI } from "@ai-sdk/openai";
import {
  PROVIDER_FACTORIES,
  PROVIDER_VERIFIERS,
} from "@/lib/ai/provider-registry.server";

describe("PROVIDER_VERIFIERS – openrouter", () => {
  it("returns { success: true } on a 200 OK response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-valid");

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      { headers: { Authorization: "Bearer sk-or-valid" } },
    );
  });

  it("returns 'Invalid API key' error on 401", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-bad-key");

    expect(result).toEqual({ success: false, error: "Invalid API key" });
  });

  it("returns status-based error message on 500", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-key");

    expect(result).toEqual({
      success: false,
      error: "OpenRouter returned 500",
    });
  });

  it("returns status-based error message on 503", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await PROVIDER_VERIFIERS.openrouter("sk-or-key");

    expect(result).toEqual({
      success: false,
      error: "OpenRouter returned 503",
    });
  });

  it("includes the API key in the Authorization header", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await PROVIDER_VERIFIERS.openrouter("sk-or-my-secret-key");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Authorization: "Bearer sk-or-my-secret-key" },
      }),
    );
  });
});

describe("PROVIDER_FACTORIES – openrouter", () => {
  it("uses createOpenAI with the openrouter baseURL", () => {
    const mockModelInstance = { modelId: "openai/gpt-4o" };
    const mockChainFn = jest.fn().mockReturnValue(mockModelInstance);
    (createOpenAI as jest.Mock).mockReturnValue(mockChainFn);

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
    const mockChainFn = jest.fn().mockReturnValue({});
    (createOpenAI as jest.Mock).mockReturnValue(mockChainFn);

    PROVIDER_FACTORIES.openrouter("sk-or-key", "google/gemini-flash");

    expect(mockChainFn).toHaveBeenCalledWith("google/gemini-flash");
  });

  it("passes the API key through to createOpenAI", () => {
    const mockChainFn = jest.fn().mockReturnValue({});
    (createOpenAI as jest.Mock).mockReturnValue(mockChainFn);

    PROVIDER_FACTORIES.openrouter("sk-or-specific-key", "any-model");

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-or-specific-key" }),
    );
  });
});
