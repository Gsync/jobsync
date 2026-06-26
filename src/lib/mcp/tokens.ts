import { createHash, randomBytes } from "crypto";

const TOKEN_PREFIX = "jsync_";

export function generateToken(): { plaintext: string; hash: string; prefix: string } {
  const plaintext = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const hash = hashToken(plaintext);
  const prefix = plaintext.slice(0, 12);
  return { plaintext, hash, prefix };
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
