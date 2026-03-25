import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { resolveApiKey } from "@/lib/api-key-resolver";
import type { AIProviderConnector, AIConnectorResult } from "../../types";

const OPENAI_API_BASE = "https://api.openai.com/v1";
const HEALTH_CHECK_TIMEOUT_MS = 10000;

export function createOpenAIProvider(): AIProviderConnector {
  return {
    id: "openai",
    name: "OpenAI",
    requiresApiKey: true,

    async healthCheck(
      userId?: string,
    ): Promise<AIConnectorResult<boolean>> {
      try {
        const apiKey = await resolveApiKey(userId, "openai");
        if (!apiKey) {
          return {
            success: false,
            error: {
              type: "auth_failed",
              message: "OpenAI API key not configured",
            },
          };
        }
        const response = await fetch(`${OPENAI_API_BASE}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: {
              type: "auth_failed",
              message: "OpenAI API key is invalid or expired",
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
              message: `OpenAI returned status ${response.status}`,
            },
          };
        }
        return { success: true, data: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: { type: "network", message: `Cannot connect to OpenAI: ${message}` },
        };
      }
    },

    async listModels(
      userId?: string,
    ): Promise<AIConnectorResult<string[]>> {
      try {
        const apiKey = await resolveApiKey(userId, "openai");
        if (!apiKey) {
          return {
            success: false,
            error: {
              type: "auth_failed",
              message: "OpenAI API key not configured",
            },
          };
        }
        const response = await fetch(`${OPENAI_API_BASE}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });
        if (!response.ok) {
          return {
            success: false,
            error: {
              type: "unavailable",
              message: `OpenAI returned status ${response.status}`,
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
          error: { type: "network", message: `Cannot connect to OpenAI: ${message}` },
        };
      }
    },

    async createModel(
      modelName: string,
      userId?: string,
    ): Promise<LanguageModel> {
      const apiKey = await resolveApiKey(userId, "openai");
      if (!apiKey) throw new Error("OpenAI API key not configured");
      const openai = createOpenAI({ apiKey });
      return openai(modelName);
    },
  };
}
