import { aiProviderRegistry } from "./registry";
import { registerAllAIProviders } from "./modules/connectors";

export type ProviderType = "openai" | "ollama" | "deepseek";

// Ensure all providers are registered on first import
let registered = false;
function ensureRegistered() {
  if (!registered) {
    registerAllAIProviders();
    registered = true;
  }
}

export async function getModel(
  provider: ProviderType,
  modelName: string,
  userId?: string,
) {
  ensureRegistered();
  const connector = aiProviderRegistry.create(provider);
  return connector.createModel(modelName, userId);
}
