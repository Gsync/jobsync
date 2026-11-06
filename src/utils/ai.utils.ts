import { JobResponse } from "@/models/job.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";

// Re-export for backwards compatibility
export { convertResumeToText } from "@/lib/ai/tools/preprocessing";
export { convertJobToText } from "@/lib/ai/tools/preprocessing-job";

export interface OllamaConnectionResult {
  isConnected: boolean;
  error?: string;
}

// Checks if a local AI provider's server (Ollama, Strata, ...) is reachable.
// Cloud providers have no "is it running" concept, so they always pass.
// Accepts a plain provider id string so callers don't need an AiProvider enum value in hand.
export const checkLocalProviderConnection = async (
  provider: string,
): Promise<OllamaConnectionResult> => {
  const entry = PROVIDER_REGISTRY[provider];
  if (!entry || entry.category !== "local" || !entry.modelsEndpoint) {
    return { isConnected: true };
  }

  try {
    const response = await fetch(`/api/ai/${entry.modelsEndpoint}`, {
      signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_LIST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        isConnected: false,
        error: `${entry.displayName} is not responding. Please make sure ${entry.displayName} is running.`,
      };
    }

    return { isConnected: true };
  } catch (error) {
    console.warn(`${entry.displayName} connection check failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      isConnected: false,
      error: `Cannot connect to ${entry.displayName}. Please make sure ${entry.displayName} is running. Error: ${errorMessage}`,
    };
  }
};
