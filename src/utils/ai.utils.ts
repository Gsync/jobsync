import { JobResponse } from "@/models/job.model";
import { AiProvider } from "@/models/ai.model";

// Re-export for backwards compatibility
export { convertResumeToText } from "@/lib/ai/tools/preprocessing";
export { convertJobToText } from "@/lib/ai/tools/preprocessing-job";

export interface OllamaConnectionResult {
  isConnected: boolean;
  error?: string;
}

// Checks if the Ollama service is reachable
export const checkOllamaConnection = async (
  provider: AiProvider,
): Promise<OllamaConnectionResult> => {
  if (provider !== AiProvider.OLLAMA) {
    return { isConnected: true };
  }

  try {
    const response = await fetch("/api/ai/ollama/tags", {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        isConnected: false,
        error:
          "Ollama service is not responding. Please make sure Ollama is running.",
      };
    }

    return { isConnected: true };
  } catch (error) {
    console.error("Error checking Ollama connection:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      isConnected: false,
      error: `Cannot connect to Ollama service. Please make sure Ollama is running. Error: ${errorMessage}`,
    };
  }
};
