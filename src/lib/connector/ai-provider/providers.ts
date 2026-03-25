import "./modules/connectors"; // triggers eager registration
import { aiProviderRegistry } from "./registry";

export type ProviderType = "openai" | "ollama" | "deepseek";

export async function getModel(
  provider: ProviderType,
  modelName: string,
  userId?: string,
) {
  const connector = aiProviderRegistry.create(provider);
  const result = await connector.createModel(modelName, userId);
  if (!result.success) {
    const message =
      "message" in result.error
        ? result.error.message
        : `Provider rate limited`;
    throw new Error(message);
  }
  return result.data;
}
