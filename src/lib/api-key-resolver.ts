import "server-only";

import db from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";

// RapidAPI is not in the AI provider registry but still needs env var resolution
const EXTRA_ENV_VARS: Record<string, string> = {
  rapidapi: "RAPIDAPI_KEY",
};

export async function resolveApiKey(
  userId: string | undefined,
  provider: string,
): Promise<string | undefined> {
  if (userId) {
    try {
      const apiKey = await db.apiKey.findUnique({
        where: { userId_provider: { userId, provider } },
      });
      if (apiKey) {
        db.apiKey
          .update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          })
          .catch(() => {});

        return decrypt(apiKey.encryptedKey, apiKey.iv);
      }
    } catch {
      // Fall through to env var
    }
  }

  const entry = PROVIDER_REGISTRY[provider];
  if (entry?.envVar) {
    const value = process.env[entry.envVar];
    if (value) return value;
  }

  const extraEnvVar = EXTRA_ENV_VARS[provider];
  if (extraEnvVar) {
    const value = process.env[extraEnvVar];
    if (value) return value;
  }

  if (entry?.defaultCredential) return entry.defaultCredential;

  return undefined;
}
