import { resolveApiKey, resolveOllamaApiKey } from "@/lib/api-key-resolver";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import { PROVIDER_FACTORIES } from "@/lib/ai/provider-registry.server";

export type ProviderType = "openai" | "ollama" | "deepseek" | "openrouter" | "gemini";

export async function getModel(
  provider: ProviderType,
  modelName: string,
  userId?: string,
) {
  const entry = PROVIDER_REGISTRY[provider];
  if (!entry) throw new Error(`Unknown AI provider: ${provider}`);

  const factory = PROVIDER_FACTORIES[provider];
  if (!factory) throw new Error(`No factory for provider: ${provider}`);

  const credential = await resolveApiKey(userId, provider);
  if (!credential)
    throw new Error(`${entry.displayName} credential not configured`);

  // Ollama's credential is a base URL; when the instance sits behind an
  // authenticated proxy, the bearer token comes from OLLAMA_API_KEY.
  const model =
    provider === "ollama"
      ? await factory(credential, modelName, { apiKey: await resolveOllamaApiKey() })
      : await factory(credential, modelName);

  return model;
}
