/**
 * AI Provider Module Tests
 *
 * Tests the module wrapper factories for each AI provider.
 * SDK factories and resolveApiKey are mocked to avoid real API calls.
 */

// Mock the SDK factories before imports
jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => {
    const modelFactory = jest.fn((name: string) => ({
      modelId: name,
      provider: "openai",
    }));
    return modelFactory;
  }),
}));

jest.mock("@ai-sdk/deepseek", () => ({
  createDeepSeek: jest.fn(() => {
    const modelFactory = jest.fn((name: string) => ({
      modelId: name,
      provider: "deepseek",
    }));
    return modelFactory;
  }),
}));

jest.mock("ollama-ai-provider-v2", () => ({
  createOllama: jest.fn(() => {
    const modelFactory = jest.fn((name: string) => ({
      modelId: name,
      provider: "ollama",
    }));
    return modelFactory;
  }),
}));

jest.mock("@/lib/api-key-resolver", () => ({
  resolveApiKey: jest.fn(),
}));

import { createOllamaProvider } from "@/lib/connector/ai-provider/modules/ollama";
import { createDeepSeekProvider } from "@/lib/connector/ai-provider/modules/deepseek";
import { createOpenAIProvider } from "@/lib/connector/ai-provider/modules/openai";
import { resolveApiKey } from "@/lib/api-key-resolver";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOllama } from "ollama-ai-provider-v2";

const mockResolveApiKey = resolveApiKey as jest.MockedFunction<
  typeof resolveApiKey
>;

describe("OllamaProvider", () => {
  const provider = createOllamaProvider();

  it("has correct metadata", () => {
    expect(provider.id).toBe("ollama");
    expect(provider.name).toBe("Ollama");
    expect(provider.requiresApiKey).toBe(false);
  });

  it("createModel calls createOllama with correct base URL", async () => {
    mockResolveApiKey.mockResolvedValue("http://custom:11434");

    await provider.createModel("llama3.2", "user-1");

    expect(createOllama).toHaveBeenCalledWith({
      baseURL: "http://custom:11434/api",
    });
  });

  it("createModel uses default base URL when resolveApiKey returns undefined", async () => {
    mockResolveApiKey.mockResolvedValue(undefined);

    await provider.createModel("llama3.1");

    expect(createOllama).toHaveBeenCalledWith({
      baseURL: "http://127.0.0.1:11434/api",
    });
  });
});

describe("DeepSeekProvider", () => {
  const provider = createDeepSeekProvider();

  it("has correct metadata", () => {
    expect(provider.id).toBe("deepseek");
    expect(provider.name).toBe("DeepSeek");
    expect(provider.requiresApiKey).toBe(true);
  });

  it("createModel calls createDeepSeek with API key", async () => {
    mockResolveApiKey.mockResolvedValue("ds-key-123");

    await provider.createModel("deepseek-chat", "user-1");

    expect(createDeepSeek).toHaveBeenCalledWith({ apiKey: "ds-key-123" });
  });

  it("createModel throws when no API key is available", async () => {
    mockResolveApiKey.mockResolvedValue(undefined);

    await expect(provider.createModel("deepseek-chat")).rejects.toThrow(
      "DeepSeek API key not configured",
    );
  });
});

describe("OpenAIProvider", () => {
  const provider = createOpenAIProvider();

  it("has correct metadata", () => {
    expect(provider.id).toBe("openai");
    expect(provider.name).toBe("OpenAI");
    expect(provider.requiresApiKey).toBe(true);
  });

  it("createModel calls createOpenAI with API key", async () => {
    mockResolveApiKey.mockResolvedValue("sk-test-key");

    await provider.createModel("gpt-4o", "user-1");

    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "sk-test-key" });
  });

  it("createModel throws when no API key is available", async () => {
    mockResolveApiKey.mockResolvedValue(undefined);

    await expect(provider.createModel("gpt-4o")).rejects.toThrow(
      "OpenAI API key not configured",
    );
  });
});
