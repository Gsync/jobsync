/**
 * API Key Resolver Tests
 *
 * Tests resolveApiKey including the plaintext iv="" handling for
 * non-sensitive keys (e.g., Ollama URLs) and encrypted key decryption.
 */

jest.mock("server-only", () => ({}));

jest.mock("@/lib/db", () => ({
  apiKey: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/lib/encryption", () => ({
  decrypt: jest.fn(
    (encrypted: string, _iv: string) => `decrypted-${encrypted}`,
  ),
}));

import { resolveApiKey } from "@/lib/api-key-resolver";
import { decrypt } from "@/lib/encryption";

const db = require("@/lib/db");
const mockDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;

describe("resolveApiKey", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.RAPIDAPI_KEY;
    db.apiKey.update.mockResolvedValue({});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("plaintext keys (iv='')", () => {
    it("returns plaintext value without calling decrypt when iv is empty", async () => {
      db.apiKey.findUnique.mockResolvedValue({
        id: "key-1",
        encryptedKey: "http://my-ollama:11434",
        iv: "",
      });

      const result = await resolveApiKey("user-1", "ollama");

      expect(result).toBe("http://my-ollama:11434");
      expect(mockDecrypt).not.toHaveBeenCalled();
    });

    it("updates lastUsedAt for plaintext keys", async () => {
      db.apiKey.findUnique.mockResolvedValue({
        id: "key-1",
        encryptedKey: "http://my-ollama:11434",
        iv: "",
      });

      await resolveApiKey("user-1", "ollama");

      expect(db.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key-1" },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });

  describe("encrypted keys (iv non-empty)", () => {
    it("calls decrypt when iv is non-empty", async () => {
      db.apiKey.findUnique.mockResolvedValue({
        id: "key-2",
        encryptedKey: "salt:abc123:encdata",
        iv: "base64ivvalue",
      });

      const result = await resolveApiKey("user-1", "openai");

      expect(mockDecrypt).toHaveBeenCalledWith(
        "salt:abc123:encdata",
        "base64ivvalue",
      );
      expect(result).toBe("decrypted-salt:abc123:encdata");
    });

    it("updates lastUsedAt for encrypted keys", async () => {
      db.apiKey.findUnique.mockResolvedValue({
        id: "key-2",
        encryptedKey: "salt:abc123:encdata",
        iv: "base64ivvalue",
      });

      await resolveApiKey("user-1", "openai");

      expect(db.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key-2" },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });

  describe("fallback behavior", () => {
    it("falls back to env var when no userId is provided", async () => {
      process.env.OPENAI_API_KEY = "sk-env-key";

      const result = await resolveApiKey(undefined, "openai");

      expect(db.apiKey.findUnique).not.toHaveBeenCalled();
      expect(result).toBe("sk-env-key");
    });

    it("falls back to env var when no DB key exists", async () => {
      db.apiKey.findUnique.mockResolvedValue(null);
      process.env.OPENAI_API_KEY = "sk-env-key";

      const result = await resolveApiKey("user-1", "openai");

      expect(result).toBe("sk-env-key");
    });

    it("falls back to env var when DB query throws", async () => {
      db.apiKey.findUnique.mockRejectedValue(new Error("DB error"));
      process.env.DEEPSEEK_API_KEY = "ds-env-key";

      const result = await resolveApiKey("user-1", "deepseek");

      expect(result).toBe("ds-env-key");
    });

    it("returns Ollama default when no DB key and no env var", async () => {
      db.apiKey.findUnique.mockResolvedValue(null);

      const result = await resolveApiKey("user-1", "ollama");

      expect(result).toBe("http://127.0.0.1:11434");
    });

    it("returns undefined for unknown provider with no env var", async () => {
      db.apiKey.findUnique.mockResolvedValue(null);

      const result = await resolveApiKey("user-1", "unknown-provider");

      expect(result).toBeUndefined();
    });

    it("prefers env var over Ollama default", async () => {
      db.apiKey.findUnique.mockResolvedValue(null);
      process.env.OLLAMA_BASE_URL = "http://env-ollama:11434";

      const result = await resolveApiKey("user-1", "ollama");

      expect(result).toBe("http://env-ollama:11434");
    });
  });
});
