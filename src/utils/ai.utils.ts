import { JobResponse } from "@/models/job.model";
import { AiProvider } from "@/models/ai.model";

// Re-export for backwards compatibility
export { convertResumeToText } from "@/lib/ai/tools/preprocessing";
export { convertJobToText } from "@/lib/ai/tools/preprocessing-job";

export interface ModelCheckResult {
  isRunning: boolean;
  error?: string;
  runningModelName?: string;
}

/**
 * Check if an Ollama model is currently running
 * @param modelName - The name of the model to check
 * @param provider - The AI provider (only checks for Ollama)
 * @returns ModelCheckResult with isRunning status and optional error message
 */
export const checkIfModelIsRunning = async (
  modelName: string | undefined,
  provider: AiProvider,
): Promise<ModelCheckResult> => {
  // Only check for Ollama provider
  if (provider !== AiProvider.OLLAMA) {
    return { isRunning: true };
  }

  if (!modelName) {
    return {
      isRunning: false,
      error: "No model selected. Please select an AI model in settings first.",
    };
  }

  try {
    const response = await fetch("/api/ai/ollama/ps", {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        isRunning: false,
        error:
          "Ollama service is not responding. Please make sure Ollama is running.",
      };
    }

    const data = await response.json();

    if (!data.models || data.models.length === 0) {
      return {
        isRunning: false,
        error: `No Ollama model is currently running. Please start ${modelName} using: ollama run ${modelName}`,
      };
    }

    const isRunning = data.models.some((m: any) => m.name === modelName);

    if (!isRunning) {
      return {
        isRunning: false,
        error: `${modelName} is not currently running. Please run the model first.`,
      };
    }

    return { isRunning: true, runningModelName: modelName };
  } catch (error) {
    console.error("Error checking if model is running:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      isRunning: false,
      error: `Cannot connect to Ollama service. Please make sure Ollama is running. Error: ${errorMessage}`,
    };
  }
};

/**
 * Fetch list of all running Ollama models
 * @returns Array of model names currently running
 */
export const fetchRunningModels = async (): Promise<{
  models: string[];
  error?: string;
}> => {
  try {
    const response = await fetch("/api/ai/ollama/ps", {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        models: [],
        error: "Failed to fetch running models. Make sure Ollama is running.",
      };
    }

    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];
    return { models };
  } catch (error) {
    console.error("Error fetching running models:", error);
    return {
      models: [],
      error: "Cannot connect to Ollama service.",
    };
  }
};
