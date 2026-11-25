import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
// Mock server-only so the module can be imported in the jest (jsdom) environment
vi.mock("server-only", () => ({}));

// Mock AI SDK packages to avoid loading provider implementations in tests
vi.mock("@ai-sdk/openai-compatible", { spy: true });
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: vi.fn() }));
vi.mock("@ai-sdk/deepseek", () => ({ createDeepSeek: vi.fn() }));
vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: vi.fn() }));
vi.mock("ollama-ai-provider-v2", () => ({ createOllama: vi.fn() }));

import { createOpenAI } from "@ai-sdk/openai";
import {
  openaiCompatibleV1Url,
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
  // The bare provider call is OpenAI's Responses API; OpenRouter gets Chat.
  it("uses createOpenAI's Chat Completions model with the openrouter baseURL", () => {
    const mockModelInstance = { modelId: "openai/gpt-4o" };
    const mockChainFn = vi.fn().mockReturnValue(mockModelInstance);
    (createOpenAI as any).mockReturnValue({ chat: mockChainFn });

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
    (createOpenAI as any).mockReturnValue({ chat: mockChainFn });

    PROVIDER_FACTORIES.openrouter("sk-or-key", "google/gemini-flash");

    expect(mockChainFn).toHaveBeenCalledWith("google/gemini-flash");
  });

  it("passes the API key through to createOpenAI", () => {
    const mockChainFn = vi.fn().mockReturnValue({});
    (createOpenAI as any).mockReturnValue({ chat: mockChainFn });

    PROVIDER_FACTORIES.openrouter("sk-or-specific-key", "any-model");

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-or-specific-key" }),
    );
  });
});

describe("OpenAI-compatible server", () => {
  const base = "http://h:1234";
  const factory = PROVIDER_FACTORIES["openai-compatible"];
  const verify = PROVIDER_VERIFIERS["openai-compatible"];
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", undefined);
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", base + "/v1/");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(["", "/", "/v1", "/v1/", "//"])("normalizes the suffix %s", suffix => {
    expect(openaiCompatibleV1Url(base + suffix)).toBe(base + "/v1");
  });

  it.each([undefined, "k"])("sends the model, options and credential through the SDK", async key => {
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", key);
    fetchMock.mockResolvedValue(Response.json({
      choices: [{ message: { role: "assistant", content: "<think>plan</think>Answer" }, finish_reason: "stop" }],
    }));
    const result = await generateText({
      model: factory(base, "m"), prompt: "x", maxRetries: 0,
      providerOptions: { openaiCompatible: { chat_template_kwargs: { enable_thinking: false } } },
    });
    expect(createOpenAICompatible).toHaveBeenCalledWith({
      name: "openai-compatible", baseURL: base + "/v1", apiKey: key,
      includeUsage: true, supportsStructuredOutputs: true,
    });
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe(base + "/v1/chat/completions");
    expect(JSON.parse(request.body)).toMatchObject({ model: "m", chat_template_kwargs: { enable_thinking: false } });
    expect(new Headers(request.headers).get("authorization")).toBe(key ? "Bearer k" : null);
    expect(result.text).toBe("Answer");
    expect(result.reasoningText).toBe("plan");
  });

  it.each([
    [base, undefined, null], [base, "k", "Bearer k"], ["http://other:1234", "k", null],
  ] as const)("verifies %s using its own credential", async (url, key, header) => {
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", key);
    fetchMock.mockResolvedValue({ ok: true });
    expect(await verify(url)).toEqual({ success: true });
    const [requestUrl, request] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe(url + "/v1/models");
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(request.headers).get("authorization")).toBe(header);
  });

  it("reports the status of an unsuccessful models response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    expect(await verify(base)).toEqual({ success: false, error: "OpenAI-compatible at http://h:1234/v1 returned 500." });
  });

  it.each([401, 403])("points a %s at the server-side key", async status => {
    fetchMock.mockResolvedValue({ ok: false, status });
    const result = await verify(base);
    expect(result).toMatchObject({ success: false, error: expect.stringMatching(/OPENAI_COMPATIBLE_API_KEY.*OPENAI_COMPATIBLE_BASE_URL/) });
    expect(result.reason).toBeUndefined();
  });

  it.each([
    [new DOMException("timeout", "TimeoutError"), /did not respond in time/, "unreachable"],
    [new TypeError("Failed to parse URL"), /Invalid OpenAI-compatible URL/, undefined],
    [new Error("unreachable"), /host.docker.internal.*Serve on Local Network/, "unreachable"],
  ] as const)("explains the connection failure", async (error, message, reason) => {
    fetchMock.mockRejectedValue(error);
    const result = await verify(base);
    expect(result).toMatchObject({ success: false, error: expect.stringMatching(message) });
    expect(result.reason).toBe(reason);
  });
});
