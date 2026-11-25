import { isLocalProvider, PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import { APP_CONSTANTS } from "@/lib/constants";

// Re-export for backwards compatibility
export { convertResumeToText } from "@/lib/ai/tools/preprocessing";
export { convertJobToText } from "@/lib/ai/tools/preprocessing-job";

export interface LocalProviderConnectionResult {
  isConnected: boolean;
  error?: string;
}

export const checkLocalProviderConnection = async (
  provider: string,
  selectedModel?: string,
): Promise<LocalProviderConnectionResult> => {
  if (!isLocalProvider(provider)) {
    return { isConnected: true };
  }

  const { displayName, modelsEndpoint } = PROVIDER_REGISTRY[provider];
  try {
    const response = await fetch(`/api/ai/${modelsEndpoint}`, {
      signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_LIST_TIMEOUT_MS),
    });

    if (response.status === 400) {
      const body = await response.json();
      if (typeof body?.error === "string") return { isConnected: false, error: body.error };
    }
    if (!response.ok) {
      return {
        isConnected: false,
        error:
          `${displayName} service is not responding. Please make sure ${displayName} is running.`,
      };
    }

    if (provider === "openai-compatible" && selectedModel) {
      const models = PROVIDER_REGISTRY[provider].parseModelsResponse?.(await response.json());
      if (!models?.includes(selectedModel)) {
        return {
          isConnected: false,
          error: `The current server does not list "${selectedModel}". Select a model in Settings → AI Provider.`,
        };
      }
    }

    return { isConnected: true };
  } catch (error) {
    console.warn(`${displayName} connection check failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      isConnected: false,
      error: `Cannot connect to ${displayName} service. Please make sure ${displayName} is running. Error: ${errorMessage}`,
    };
  }
};
