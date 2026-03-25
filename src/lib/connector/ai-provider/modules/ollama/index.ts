import { createOllama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";
import { resolveApiKey } from "@/lib/api-key-resolver";
import { validateOllamaUrl } from "@/lib/url-validation";
import type { AIProviderConnector, AIConnectorResult } from "../../types";

const OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const HEALTH_CHECK_TIMEOUT_MS = 5000;

export function createOllamaProvider(): AIProviderConnector {
  return {
    id: "ollama",
    name: "Ollama",
    requiresApiKey: false,

    async healthCheck(
      userId?: string,
    ): Promise<AIConnectorResult<boolean>> {
      try {
        const baseUrl = await resolveBaseUrl(userId);
        const response = await fetch(`${baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });
        if (!response.ok) {
          return {
            success: false,
            error: {
              type: "unavailable",
              message: `Ollama returned status ${response.status}`,
            },
          };
        }
        return { success: true, data: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: { type: "network", message: `Cannot connect to Ollama: ${message}` },
        };
      }
    },

    async listModels(
      userId?: string,
    ): Promise<AIConnectorResult<string[]>> {
      try {
        const baseUrl = await resolveBaseUrl(userId);
        const response = await fetch(`${baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });
        if (!response.ok) {
          return {
            success: false,
            error: {
              type: "unavailable",
              message: `Ollama returned status ${response.status}`,
            },
          };
        }
        const data = await response.json();
        const models: string[] =
          data.models?.map((m: { name: string }) => m.name) ?? [];
        return { success: true, data: models };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: { type: "network", message: `Cannot connect to Ollama: ${message}` },
        };
      }
    },

    async createModel(
      modelName: string,
      userId?: string,
    ): Promise<LanguageModel> {
      const baseUrl = await resolveBaseUrl(userId);
      const ollama = createOllama({
        baseURL: baseUrl + "/api",
      });
      return ollama(modelName);
    },
  };
}

async function resolveBaseUrl(userId?: string): Promise<string> {
  const resolved = await resolveApiKey(userId, "ollama");
  const url = resolved || OLLAMA_DEFAULT_BASE_URL;
  const validation = validateOllamaUrl(url);
  if (!validation.valid) {
    console.error("[Security] Ollama URL failed validation, using fallback");
    return OLLAMA_DEFAULT_BASE_URL;
  }
  return url;
}
