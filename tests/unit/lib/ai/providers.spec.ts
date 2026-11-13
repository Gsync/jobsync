// Mock server-only dependencies to allow importing getModel in the jsdom environment
vi.mock("@/lib/api-key-resolver", () => ({
  resolveApiKey: vi.fn(),
}));

vi.mock("@/lib/ai/provider-registry.server", () => ({
  PROVIDER_FACTORIES: {
    openrouter: vi.fn(),
    openai: vi.fn(),
    deepseek: vi.fn(),
    ollama: vi.fn(),
    gemini: vi.fn(),
  },
}));

import { getModel } from "@/lib/ai/providers";
import { resolveApiKey } from "@/lib/api-key-resolver";
import { PROVIDER_FACTORIES } from "@/lib/ai/provider-registry.server";

describe("getModel – openrouter", () => {
  const mockModelInstance = { modelId: "openai/gpt-4o" };

  beforeEach(() => {
    (PROVIDER_FACTORIES.openrouter as any).mockReturnValue(
      mockModelInstance,
    );
  });

  it("resolves credentials and returns a model instance", async () => {
    (resolveApiKey as any).mockResolvedValue("sk-or-test-key");

    const result = await getModel("openrouter", "openai/gpt-4o", "user-1");

    expect(resolveApiKey).toHaveBeenCalledWith("user-1", "openrouter");
    expect(PROVIDER_FACTORIES.openrouter).toHaveBeenCalledWith(
      "sk-or-test-key",
      "openai/gpt-4o",
    );
    expect(result).toBe(mockModelInstance);
  });

  it("works without a userId (falls back to env var resolution)", async () => {
    (resolveApiKey as any).mockResolvedValue("sk-or-from-env");

    const result = await getModel("openrouter", "openai/gpt-4o");

    expect(resolveApiKey).toHaveBeenCalledWith(undefined, "openrouter");
    expect(result).toBe(mockModelInstance);
  });

  it("throws when OpenRouter credential is not configured", async () => {
    (resolveApiKey as any).mockResolvedValue(undefined);

    await expect(
      getModel("openrouter", "openai/gpt-4o", "user-1"),
    ).rejects.toThrow("OpenRouter credential not configured");
  });

  it("passes the model name to the factory", async () => {
    (resolveApiKey as any).mockResolvedValue("sk-or-key");

    await getModel("openrouter", "anthropic/claude-3-opus", "user-1");

    expect(PROVIDER_FACTORIES.openrouter).toHaveBeenCalledWith(
      "sk-or-key",
      "anthropic/claude-3-opus",
    );
  });
});

describe("getModel – provider validation", () => {
  it("throws for unknown provider", async () => {
    (resolveApiKey as any).mockResolvedValue("some-key");

    await expect(
      getModel("unknown-provider" as any, "some-model"),
    ).rejects.toThrow("Unknown AI provider");
  });

  it("recognizes openrouter as a valid ProviderType", async () => {
    (resolveApiKey as any).mockResolvedValue("sk-or-key");
    (PROVIDER_FACTORIES.openrouter as any).mockReturnValue({});

    // Should resolve without throwing
    await expect(
      getModel("openrouter", "openai/gpt-4o"),
    ).resolves.toBeDefined();
  });
});
