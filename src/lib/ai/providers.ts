import { resolveApiKey } from "@/lib/api-key-resolver";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import { PROVIDER_FACTORIES } from "@/lib/ai/provider-registry.server";
import { createOpenAI } from "@ai-sdk/openai";

export type ProviderType = "openai" | "openai-compatible" | "ollama" | "deepseek" | "openrouter" | "gemini";

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

  if (provider === "openai-compatible") {
    const apiKey = await resolveApiKey(userId, "openai-compatible-key");
    return createOpenAI({ baseURL: credential, apiKey: apiKey || "" })(modelName);
  }

  return factory(credential, modelName);
}
