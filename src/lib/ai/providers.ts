import { resolveApiKey } from "@/lib/api-key-resolver";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import {
  openaiCompatibleRoot,
  PROVIDER_FACTORIES,
} from "@/lib/ai/provider-registry.server";
import { createOpenAI } from "@ai-sdk/openai";

export type ProviderType =
  | "openai"
  | "openai-compatible"
  | "ollama"
  | "deepseek"
  | "openrouter"
  | "gemini";

export async function getModel(
  provider: ProviderType,
  modelName: string,
  userId?: string,
) {
  const entry = PROVIDER_REGISTRY[provider];
  if (!entry) throw new Error(`Unknown AI provider: ${provider}`);

  const credential = await resolveApiKey(userId, provider);
  if (!credential)
    throw new Error(`${entry.displayName} credential not configured`);

  if (provider === "openai-compatible") {
    if (!modelName) {
      throw new Error("Select a model for the OpenAI-compatible provider");
    }
    const apiKey = await resolveApiKey(userId, "openai-compatible-key");
    const root = openaiCompatibleRoot(credential);
    // Local OpenAI-compatible servers (llama.cpp, llama-swap, LM Studio)
    // implement Chat Completions. createOpenAI()(model) uses the Responses
    // API, whose stream (text-delta without text-start) fails in agent chat.
    return createOpenAI({
      baseURL: `${root}/v1`,
      apiKey: apiKey || "",
      name: "openai-compatible",
    }).chat(modelName);
  }

  const factory = PROVIDER_FACTORIES[provider];
  if (!factory) throw new Error(`No factory for provider: ${provider}`);

  return factory(credential, modelName);
}
