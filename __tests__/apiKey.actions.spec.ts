import { getOllamaBaseUrl } from "@/actions/apiKey.actions";
import { getCurrentUser } from "@/utils/user.utils";

jest.mock("@/lib/db", () => ({
  apiKey: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  handleError: jest.fn((_error: unknown, msg: string) => ({
    success: false,
    message: msg,
  })),
}));

jest.mock("@/lib/encryption", () => ({
  encrypt: jest.fn((key: string) => ({ encrypted: `enc-${key}`, iv: "iv-1" })),
  getLast4: jest.fn((key: string) => key.slice(-4)),
  decrypt: jest.fn(
    (encrypted: string) => `decrypted-${encrypted}`,
  ),
}));

const db = require("@/lib/db");

describe("getOllamaBaseUrl", () => {
  const originalEnv = process.env.OLLAMA_BASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OLLAMA_BASE_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.OLLAMA_BASE_URL = originalEnv;
    } else {
      delete process.env.OLLAMA_BASE_URL;
    }
  });

  it("returns stored plaintext URL when valid", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" });
    db.apiKey.findUnique.mockResolvedValue({
      encryptedKey: "http://my-ollama:11434",
      iv: "",
    });

    const result = await getOllamaBaseUrl();
    expect(result).toBe("http://my-ollama:11434");
  });

  it("falls back when stored URL has invalid protocol", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" });
    db.apiKey.findUnique.mockResolvedValue({
      encryptedKey: "ftp://malicious-server",
      iv: "",
    });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const result = await getOllamaBaseUrl();

    expect(result).toBe("http://127.0.0.1:11434");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Security] Stored Ollama URL failed validation, using fallback",
    );
    consoleSpy.mockRestore();
  });

  it("falls back when stored URL has credentials", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" });
    db.apiKey.findUnique.mockResolvedValue({
      encryptedKey: "http://admin:pass@internal:11434",
      iv: "",
    });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const result = await getOllamaBaseUrl();

    expect(result).toBe("http://127.0.0.1:11434");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Security] Stored Ollama URL failed validation, using fallback",
    );
    consoleSpy.mockRestore();
  });

  it("uses OLLAMA_BASE_URL env var as fallback", async () => {
    process.env.OLLAMA_BASE_URL = "http://env-ollama:11434";
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" });
    db.apiKey.findUnique.mockResolvedValue({
      encryptedKey: "file:///etc/passwd",
      iv: "",
    });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const result = await getOllamaBaseUrl();

    expect(result).toBe("http://env-ollama:11434");
    consoleSpy.mockRestore();
  });

  it("returns default when no user is authenticated", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    const result = await getOllamaBaseUrl();
    expect(result).toBe("http://127.0.0.1:11434");
  });

  it("returns default when no API key is stored", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" });
    db.apiKey.findUnique.mockResolvedValue(null);
    const result = await getOllamaBaseUrl();
    expect(result).toBe("http://127.0.0.1:11434");
  });

  it("returns default on database error", async () => {
    (getCurrentUser as jest.Mock).mockRejectedValue(new Error("DB down"));
    const result = await getOllamaBaseUrl();
    expect(result).toBe("http://127.0.0.1:11434");
  });
});
