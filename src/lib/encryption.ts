import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;

/** Legacy hardcoded salt — used only to decrypt old records. */
const LEGACY_SALT = "jobsync-api-key-encryption";

function deriveKey(secret: string, salt: Buffer | string): Buffer {
  return pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
}

function getSecret(): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  return secret;
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const secret = getSecret();
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();
  // Append auth tag to encrypted data
  const combined = Buffer.concat([
    Buffer.from(encrypted, "base64"),
    authTag,
  ]).toString("base64");

  // Prefix the encrypted data with the salt so decrypt can extract it.
  // Format: "salt:<hex>:<base64-payload>"
  const saltedEncrypted = `salt:${salt.toString("hex")}:${combined}`;

  return {
    encrypted: saltedEncrypted,
    iv: iv.toString("base64"),
  };
}

export function decrypt(encryptedData: string, iv: string): string {
  const secret = getSecret();

  let key: Buffer;
  let payload: string;

  if (encryptedData.startsWith("salt:")) {
    // New format: "salt:<hex>:<base64-payload>"
    const parts = encryptedData.split(":");
    const saltHex = parts[1];
    payload = parts.slice(2).join(":"); // rejoin in case base64 ever contains ':'
    const salt = Buffer.from(saltHex, "hex");
    key = deriveKey(secret, salt);
  } else {
    // Legacy format: plain base64 payload with hardcoded salt
    payload = encryptedData;
    key = deriveKey(secret, LEGACY_SALT);
  }

  const ivBuffer = Buffer.from(iv, "base64");
  const combined = Buffer.from(payload, "base64");

  // Extract auth tag from end of combined data
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

export function getLast4(key: string): string {
  return key.slice(-4);
}
