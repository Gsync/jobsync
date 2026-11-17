import { createHash } from "crypto";
import { generateToken, hashToken } from "@/lib/mcp/tokens";

describe("hashToken", () => {
  it("returns the sha256 hex digest of the input", () => {
    const plaintext = "jsync_abc123";
    expect(hashToken(plaintext)).toBe(
      createHash("sha256").update(plaintext).digest("hex"),
    );
  });

  it("is deterministic for the same input", () => {
    expect(hashToken("same-value")).toBe(hashToken("same-value"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("value-a")).not.toBe(hashToken("value-b"));
  });
});

describe("generateToken", () => {
  it("prefixes the plaintext with jsync_", () => {
    const { plaintext } = generateToken();
    expect(plaintext.startsWith("jsync_")).toBe(true);
  });

  it("returns a hash matching hashToken(plaintext)", () => {
    const { plaintext, hash } = generateToken();
    expect(hash).toBe(hashToken(plaintext));
  });

  it("returns a prefix that is the first 12 characters of the plaintext", () => {
    const { plaintext, prefix } = generateToken();
    expect(prefix).toBe(plaintext.slice(0, 12));
    expect(prefix).toHaveLength(12);
  });

  it("generates unique plaintext/hash on each call", () => {
    const first = generateToken();
    const second = generateToken();
    expect(first.plaintext).not.toBe(second.plaintext);
    expect(first.hash).not.toBe(second.hash);
  });
});
