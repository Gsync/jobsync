import { aiProviderRegistry } from "../registry";
import { createOllamaProvider } from "./ollama";
import { createDeepSeekProvider } from "./deepseek";
import { createOpenAIProvider } from "./openai";

export function registerAllAIProviders() {
  aiProviderRegistry.register("ollama", createOllamaProvider);
  aiProviderRegistry.register("deepseek", createDeepSeekProvider);
  aiProviderRegistry.register("openai", createOpenAIProvider);
}
