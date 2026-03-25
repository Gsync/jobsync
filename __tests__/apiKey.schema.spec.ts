import { apiKeySaveSchema } from "@/models/apiKey.schema";

describe("apiKeySaveSchema", () => {
  describe("non-ollama providers", () => {
    it("accepts valid openai input", () => {
      const result = apiKeySaveSchema.parse({
        provider: "openai",
        key: "sk-abc123",
      });
      expect(result.provider).toBe("openai");
      expect(result.key).toBe("sk-abc123");
    });

    it("accepts valid deepseek input", () => {
      const result = apiKeySaveSchema.parse({
        provider: "deepseek",
        key: "ds-xyz",
      });
      expect(result.provider).toBe("deepseek");
    });

    it("rejects empty key", () => {
      expect(() =>
        apiKeySaveSchema.parse({ provider: "openai", key: "" }),
      ).toThrow();
    });

    it("rejects unknown provider", () => {
      expect(() =>
        apiKeySaveSchema.parse({ provider: "unknown", key: "abc" }),
      ).toThrow();
    });
  });

  describe("ollama provider URL validation", () => {
    it("accepts valid http localhost URL", () => {
      const result = apiKeySaveSchema.parse({
        provider: "ollama",
        key: "http://localhost:11434",
        sensitive: false,
      });
      expect(result.key).toBe("http://localhost:11434");
    });

    it("accepts valid https URL", () => {
      const result = apiKeySaveSchema.parse({
        provider: "ollama",
        key: "https://ollama.example.com",
        sensitive: false,
      });
      expect(result.key).toBe("https://ollama.example.com");
    });

    it("rejects file:// protocol", () => {
      const result = apiKeySaveSchema.safeParse({
        provider: "ollama",
        key: "file:///etc/passwd",
        sensitive: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const keyIssue = result.error.issues.find((i) =>
          i.path.includes("key"),
        );
        expect(keyIssue?.message).toBe(
          "Only http and https protocols are allowed",
        );
      }
    });

    it("rejects ftp:// protocol", () => {
      const result = apiKeySaveSchema.safeParse({
        provider: "ollama",
        key: "ftp://internal-server",
        sensitive: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const keyIssue = result.error.issues.find((i) =>
          i.path.includes("key"),
        );
        expect(keyIssue?.message).toBe(
          "Only http and https protocols are allowed",
        );
      }
    });

    it("rejects URLs with credentials", () => {
      const result = apiKeySaveSchema.safeParse({
        provider: "ollama",
        key: "http://user:pass@internal:11434",
        sensitive: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const keyIssue = result.error.issues.find((i) =>
          i.path.includes("key"),
        );
        expect(keyIssue?.message).toBe(
          "URLs with credentials are not allowed",
        );
      }
    });

    it("rejects non-URL strings", () => {
      const result = apiKeySaveSchema.safeParse({
        provider: "ollama",
        key: "not-a-url",
        sensitive: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const keyIssue = result.error.issues.find((i) =>
          i.path.includes("key"),
        );
        expect(keyIssue?.message).toBe("Invalid URL format");
      }
    });

    it("does not apply URL validation to other providers", () => {
      // An openai key like "not-a-url" should still pass (it's not a URL provider)
      const result = apiKeySaveSchema.parse({
        provider: "openai",
        key: "not-a-url-but-valid-key",
      });
      expect(result.key).toBe("not-a-url-but-valid-key");
    });
  });
});
