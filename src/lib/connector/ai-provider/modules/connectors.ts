import { aiProviderRegistry } from "../registry";
import { createOllamaProvider } from "./ollama";
import { createDeepSeekProvider } from "./deepseek";
import { createOpenAIProvider } from "./openai";

// Register all providers eagerly at import time
aiProviderRegistry.register("ollama", createOllamaProvider);
aiProviderRegistry.register("deepseek", createDeepSeekProvider);
aiProviderRegistry.register("openai", createOpenAIProvider);

// Keep the function export for explicit re-registration if needed
export function registerAllAIProviders() {
  aiProviderRegistry.register("ollama", createOllamaProvider);
  aiProviderRegistry.register("deepseek", createDeepSeekProvider);
  aiProviderRegistry.register("openai", createOpenAIProvider);
}
