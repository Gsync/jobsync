import "server-only";

import db from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";

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

        if (apiKey.iv === "") return apiKey.encryptedKey;
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

  if (entry?.defaultCredential) return entry.defaultCredential;

  return undefined;
}

// Ollama's credential is a base URL (see PROVIDER_REGISTRY.ollama), so a bearer
// token for an authenticated proxy is resolved separately from it via the
// provider-specific apiKeyEnvVar (OLLAMA_API_KEY).
export async function resolveOllamaApiKey(): Promise<string | undefined> {
  const entry = PROVIDER_REGISTRY.ollama;
  const envVar = entry?.apiKeyEnvVar;
  const value = envVar ? process.env[envVar]?.trim() : undefined;
  return value ? value : undefined;
}
