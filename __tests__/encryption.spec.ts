import { beforeAll, describe, expect, it } from "vitest";
import {
  createCipheriv,
  pbkdf2Sync,
  randomBytes,
} from "crypto";
import { decrypt, encrypt, getLast4 } from "@/lib/encryption";

const TEST_KEY = "test-encryption-key-do-not-use-in-prod";
const LEGACY_SALT = "jobsync-api-key-encryption";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

// Reproduces the pre-per-record-salt scheme: static LEGACY_SALT and a bare
// (non-dotted) iv, so we can assert decrypt() still reads old records.
function encryptLegacy(plaintext: string): { encrypted: string; iv: string } {
  const key = pbkdf2Sync(TEST_KEY, LEGACY_SALT, 100_000, 32, "sha256");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([
    Buffer.from(encrypted, "base64"),
    authTag,
  ]).toString("base64");
  return { encrypted: combined, iv: iv.toString("base64") };
}

describe("encrypt/decrypt round-trip", () => {
  it("recovers the original plaintext", () => {
    const secret = "sk-1234567890abcdef";
    const { encrypted, iv } = encrypt(secret);
    expect(decrypt(encrypted, iv)).toBe(secret);
  });

  it("handles unicode and empty strings", () => {
    for (const value of ["", "clé-secrète-🔑", "a".repeat(5000)]) {
      const { encrypted, iv } = encrypt(value);
      expect(decrypt(encrypted, iv)).toBe(value);
    }
  });

  it("stores the iv as salt.iv", () => {
    const { iv } = encrypt("value");
    const [salt, ivPart] = iv.split(".");
    expect(iv.includes(".")).toBe(true);
    expect(Buffer.from(salt, "base64")).toHaveLength(16);
    expect(Buffer.from(ivPart, "base64")).toHaveLength(12);
  });

  it("produces a unique salt and iv on every call", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a.iv).not.toBe(b.iv);
    expect(a.encrypted).not.toBe(b.encrypted);
  });
});

describe("decrypt legacy records", () => {
  it("decrypts records encrypted with the static legacy salt", () => {
    const secret = "legacy-api-key";
    const { encrypted, iv } = encryptLegacy(secret);
    expect(iv.includes(".")).toBe(false);
    expect(decrypt(encrypted, iv)).toBe(secret);
  });
});

describe("tamper detection", () => {
  it("throws when the ciphertext is altered", () => {
    const { encrypted, iv } = encrypt("secret");
    const bytes = Buffer.from(encrypted, "base64");
    bytes[0] ^= 0xff;
    expect(() => decrypt(bytes.toString("base64"), iv)).toThrow();
  });

  it("throws when decrypted with the wrong salt", () => {
    const { encrypted, iv } = encrypt("secret");
    const [, ivPart] = iv.split(".");
    const wrongSalt = randomBytes(16).toString("base64");
    expect(() => decrypt(encrypted, `${wrongSalt}.${ivPart}`)).toThrow();
  });
});

describe("ENCRYPTION_KEY guard", () => {
  it("throws when the key is not set", () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => encrypt("value")).toThrow("ENCRYPTION_KEY is not set");
    } finally {
      process.env.ENCRYPTION_KEY = original;
    }
  });
});

describe("getLast4", () => {
  it("returns the last 4 characters", () => {
    expect(getLast4("sk-abcdef1234")).toBe("1234");
  });

  it("returns the whole string when shorter than 4", () => {
    expect(getLast4("ab")).toBe("ab");
  });
});
