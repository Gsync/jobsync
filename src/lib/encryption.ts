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
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
// Fallback for decrypting records created before per-record random salts
const LEGACY_SALT = "jobsync-api-key-encryption";

function getDerivedKey(salt: string | Buffer): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  return pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const salt = randomBytes(SALT_LENGTH);
  const key = getDerivedKey(salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([
    Buffer.from(encrypted, "base64"),
    authTag,
  ]).toString("base64");

  return {
    encrypted: combined,
    iv: `${salt.toString("base64")}.${iv.toString("base64")}`,
  };
}

export function decrypt(encryptedData: string, iv: string): string {
  let salt: string | Buffer;
  let ivBase64: string;

  if (iv.includes(".")) {
    const [saltPart, ivPart] = iv.split(".");
    salt = Buffer.from(saltPart, "base64");
    ivBase64 = ivPart;
  } else {
    salt = LEGACY_SALT;
    ivBase64 = iv;
  }

  const key = getDerivedKey(salt);
  const ivBuffer = Buffer.from(ivBase64, "base64");
  const combined = Buffer.from(encryptedData, "base64");

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
