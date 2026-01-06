import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { createDeepSeek } from "@ai-sdk/deepseek";

export type ProviderType = "openai" | "ollama" | "deepseek";

/**
 * Get a language model instance for the specified provider and model.
 */
export function getModel(provider: ProviderType, modelName: string) {
  if (provider === "openai") {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    return openai(modelName);
  }

  if (provider === "deepseek") {
    const deepseek = createDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
    return deepseek(modelName);
  }

  // Use ollama-ai-provider-v2 for Ollama
  const ollama = createOllama({
    baseURL: (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434") + "/api",
  });

  return ollama(modelName);
}
