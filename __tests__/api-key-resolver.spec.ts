// Unit tests for resolveApiKey: db (per-user) -> env var -> provider default.

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn((..._args: unknown[]) => ({ catch: () => {} }));

vi.mock("@/lib/db", () => ({
  default: {
    apiKey: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: (key: string, iv: string) => `decrypted(${key},${iv})`,
}));

vi.mock("@/lib/ai/provider-registry", () => ({
  PROVIDER_REGISTRY: {
    openai: { envVar: "OPENAI_API_KEY" },
    ollama: { defaultCredential: "ollama-default" },
    deepseek: { envVar: "DEEPSEEK_API_KEY", defaultCredential: "ds-default" },
  },
}));

import { resolveApiKey } from "@/lib/api-key-resolver";

describe("resolveApiKey", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV };
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.RAPIDAPI_KEY;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns the decrypted per-user key when one exists", async () => {
    mockFindUnique.mockResolvedValue({
      id: "k1",
      encryptedKey: "cipher",
      iv: "saltiv",
    });

    const result = await resolveApiKey("user-1", "openai");

    expect(result).toBe("decrypted(cipher,saltiv)");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "k1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("returns the raw key when iv is empty (unencrypted legacy record)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "k2",
      encryptedKey: "plaintext-key",
      iv: "",
    });

    const result = await resolveApiKey("user-1", "openai");

    expect(result).toBe("plaintext-key");
  });

  it("falls back to the provider env var when the user has no key", async () => {
    mockFindUnique.mockResolvedValue(null);
    process.env.OPENAI_API_KEY = "env-openai";

    const result = await resolveApiKey("user-1", "openai");

    expect(result).toBe("env-openai");
  });

  it("resolves the rapidapi extra env var (not in the registry)", async () => {
    process.env.RAPIDAPI_KEY = "rapid-123";

    const result = await resolveApiKey(undefined, "rapidapi");

    expect(result).toBe("rapid-123");
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("falls back to the provider default credential", async () => {
    const result = await resolveApiKey(undefined, "ollama");

    expect(result).toBe("ollama-default");
  });

  it("prefers the env var over the default credential", async () => {
    mockFindUnique.mockResolvedValue(null);
    process.env.DEEPSEEK_API_KEY = "env-ds";

    const result = await resolveApiKey("user-1", "deepseek");

    expect(result).toBe("env-ds");
  });

  it("returns undefined when nothing resolves", async () => {
    const result = await resolveApiKey(undefined, "unknown-provider");

    expect(result).toBeUndefined();
  });

  it("falls through to env var when the db lookup throws", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));
    process.env.OPENAI_API_KEY = "env-openai";

    const result = await resolveApiKey("user-1", "openai");

    expect(result).toBe("env-openai");
  });

  it("skips the db lookup entirely when no userId is given", async () => {
    process.env.OPENAI_API_KEY = "env-openai";

    const result = await resolveApiKey(undefined, "openai");

    expect(result).toBe("env-openai");
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
