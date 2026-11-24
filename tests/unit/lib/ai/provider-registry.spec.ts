import { PROVIDER_REGISTRY, AI_PROVIDERS, isLocalProvider } from "@/lib/ai/provider-registry";

describe("AI_PROVIDERS", () => {
  it("includes openrouter", () => {
    expect(AI_PROVIDERS).toContain("openrouter");
  });

  it("contains exactly 6 providers", () => {
    expect(AI_PROVIDERS).toHaveLength(6);
  });

  it("contains ollama, openai, deepseek, openrouter, gemini, openai-compatible", () => {
    expect(AI_PROVIDERS).toEqual(
      expect.arrayContaining([
        "ollama",
        "openai",
        "deepseek",
        "openrouter",
        "gemini",
        "openai-compatible",
      ]),
    );
  });
});

describe("PROVIDER_REGISTRY – openrouter entry", () => {
  const entry = PROVIDER_REGISTRY.openrouter;

  it("exists in the registry", () => {
    expect(entry).toBeDefined();
  });

  it("has id 'openrouter'", () => {
    expect(entry.id).toBe("openrouter");
  });

  it("has displayName 'OpenRouter'", () => {
    expect(entry.displayName).toBe("OpenRouter");
  });

  it("uses api-key credential type", () => {
    expect(entry.credentialType).toBe("api-key");
  });

  it("is categorized as cloud", () => {
    expect(entry.category).toBe("cloud");
  });

  it("uses OPENROUTER_API_KEY env var", () => {
    expect(entry.envVar).toBe("OPENROUTER_API_KEY");
  });

  it("has correct modelsEndpoint", () => {
    expect(entry.modelsEndpoint).toBe("openrouter/models");
  });

  it("does not require a running check", () => {
    expect(entry.requiresRunningCheck).toBe(false);
  });

  it("does not support keepAlive", () => {
    expect(entry.supportsKeepAlive).toBe(false);
  });

  it("has password input type", () => {
    expect(entry.keyConfig.inputType).toBe("password");
  });

  it("marks key as sensitive", () => {
    expect(entry.keyConfig.sensitive).toBe(true);
  });

  it("placeholder starts with sk-or-", () => {
    expect(entry.keyConfig.placeholder).toMatch(/^sk-or-/);
  });

  it("has no defaultCredential", () => {
    expect(entry.defaultCredential).toBeUndefined();
  });

  describe("parseModelsResponse", () => {
    it("maps model ids and sorts alphabetically", () => {
      const data = {
        data: [
          { id: "mistral/mistral-7b" },
          { id: "anthropic/claude-2" },
          { id: "openai/gpt-4" },
        ],
      };
      expect(entry.parseModelsResponse!(data)).toEqual([
        "anthropic/claude-2",
        "mistral/mistral-7b",
        "openai/gpt-4",
      ]);
    });

    it("returns empty array when data property is missing", () => {
      expect(entry.parseModelsResponse!({})).toEqual([]);
    });

    it("returns empty array when data.data is empty", () => {
      expect(entry.parseModelsResponse!({ data: [] })).toEqual([]);
    });

    it("returns a single model correctly", () => {
      const data = { data: [{ id: "openai/gpt-4o" }] };
      expect(entry.parseModelsResponse!(data)).toEqual(["openai/gpt-4o"]);
    });

    it("sorts multiple models alphabetically", () => {
      const data = {
        data: [{ id: "z-model" }, { id: "a-model" }, { id: "m-model" }],
      };
      expect(entry.parseModelsResponse!(data)).toEqual([
        "a-model",
        "m-model",
        "z-model",
      ]);
    });

    it("handles models with slash-separated provider/name format", () => {
      const data = {
        data: [
          { id: "google/gemini-pro" },
          { id: "anthropic/claude-3-opus" },
          { id: "meta-llama/llama-3-8b" },
        ],
      };
      const result = entry.parseModelsResponse!(data);
      expect(result).toEqual([
        "anthropic/claude-3-opus",
        "google/gemini-pro",
        "meta-llama/llama-3-8b",
      ]);
    });
  });
});

describe("OpenAI-compatible settings", () => {
  const entry = PROVIDER_REGISTRY["openai-compatible"];

  it("offers a local base URL and leaves it unset by default", () => {
    expect(entry).toMatchObject({
      displayName: "OpenAI-compatible", credentialType: "base-url", category: "local",
      envVar: "OPENAI_COMPATIBLE_BASE_URL", modelsEndpoint: "openai-compatible/models",
      keyConfig: { sensitive: false, placeholder: "http://host.docker.internal:1234", description: expect.stringContaining("16k") },
    });
    expect(entry.defaultCredential).toBeUndefined();
  });

  it("offers chat models and excludes embedding models", () => {
    expect(entry.parseModelsResponse!({ data: [
      { id: "qwen3.5-9b" }, { id: "text-embedding-nomic-embed-text-v1.5" }, { id: "Embed-small" },
    ] })).toEqual(["qwen3.5-9b"]);
    expect(entry.parseModelsResponse!({})).toEqual([]);
  });

  it.each([["ollama", true], ["openai-compatible", true], ["openai", false], ["gemini", false], ["nope", false]] as const)(
    "classifies %s", (id, expected) => expect(isLocalProvider(id)).toBe(expected),
  );
});
