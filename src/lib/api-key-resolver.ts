import "server-only";

import db from "@/lib/db";
import { decrypt } from "@/lib/encryption";

const ENV_VAR_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  rapidapi: "RAPIDAPI_KEY",
  ollama: "OLLAMA_BASE_URL",
};

const OLLAMA_DEFAULT = "http://127.0.0.1:11434";

export async function resolveApiKey(
  userId: string | undefined,
  provider: string,
): Promise<string | undefined> {
  // Try user DB key first
  if (userId) {
    try {
      const apiKey = await db.apiKey.findUnique({
        where: { userId_provider: { userId, provider } },
      });
      if (apiKey) {
        // Update lastUsedAt in background
        db.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        return decrypt(apiKey.encryptedKey, apiKey.iv);
      }
    } catch {
      // Fall through to env var
    }
  }

  // Env var fallback
  const envVar = ENV_VAR_MAP[provider];
  if (envVar) {
    const value = process.env[envVar];
    if (value) return value;
  }

  // Ollama default
  if (provider === "ollama") return OLLAMA_DEFAULT;

  return undefined;
}
