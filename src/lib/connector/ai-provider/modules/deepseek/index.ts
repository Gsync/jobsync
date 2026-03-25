import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";
import { resolveApiKey } from "@/lib/api-key-resolver";
import type { AIProviderConnector, AIConnectorResult } from "../../types";

const DEEPSEEK_API_BASE = "https://api.deepseek.com";
const HEALTH_CHECK_TIMEOUT_MS = 10000;

export function createDeepSeekProvider(): AIProviderConnector {
  return {
    id: "deepseek",
    name: "DeepSeek",
    requiresApiKey: true,

    async healthCheck(
      userId?: string,
    ): Promise<AIConnectorResult<boolean>> {
      try {
        const apiKey = await resolveApiKey(userId, "deepseek");
        if (!apiKey) {
          return {
            success: false,
            error: {
              type: "auth_failed",
              message: "DeepSeek API key not configured",
            },
          };
        }
        const response = await fetch(`${DEEPSEEK_API_BASE}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: {
              type: "auth_failed",
              message: "DeepSeek API key is invalid or expired",
            },
          };
        }
        if (response.status === 429) {
          return {
            success: false,
            error: { type: "rate_limited" },
          };
        }
        if (!response.ok) {
          return {
            success: false,
            error: {
              type: "unavailable",
              message: `DeepSeek returned status ${response.status}`,
            },
          };
        }
        return { success: true, data: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: { type: "network", message: `Cannot connect to DeepSeek: ${message}` },
        };
      }
    },

    async listModels(
      userId?: string,
    ): Promise<AIConnectorResult<string[]>> {
      try {
        const apiKey = await resolveApiKey(userId, "deepseek");
        if (!apiKey) {
          return {
            success: false,
            error: {
              type: "auth_failed",
              message: "DeepSeek API key not configured",
            },
          };
        }
        const response = await fetch(`${DEEPSEEK_API_BASE}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });
        if (!response.ok) {
          return {
            success: false,
            error: {
              type: "unavailable",
              message: `DeepSeek returned status ${response.status}`,
            },
          };
        }
        const data = await response.json();
        const models: string[] =
          data.data?.map((m: { id: string }) => m.id) ?? [];
        return { success: true, data: models };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: { type: "network", message: `Cannot connect to DeepSeek: ${message}` },
        };
      }
    },

    async createModel(
      modelName: string,
      userId?: string,
    ): Promise<LanguageModel> {
      const apiKey = await resolveApiKey(userId, "deepseek");
      if (!apiKey) throw new Error("DeepSeek API key not configured");
      const deepseek = createDeepSeek({ apiKey });
      return deepseek(modelName);
    },
  };
}
