import type { LanguageModel } from "ai";

export type AIConnectorError =
  | { type: "unavailable"; message: string }
  | { type: "auth_failed"; message: string }
  | { type: "rate_limited"; retryAfter?: number }
  | { type: "network"; message: string };

export type AIConnectorResult<T> =
  | { success: true; data: T }
  | { success: false; error: AIConnectorError };

export interface AIProviderConnector {
  readonly id: string;
  readonly name: string;
  readonly requiresApiKey: boolean;

  healthCheck(userId?: string): Promise<AIConnectorResult<boolean>>;
  listModels(userId?: string): Promise<AIConnectorResult<string[]>>;
  createModel(
    modelName: string,
    userId?: string,
  ): Promise<AIConnectorResult<LanguageModel>>;
}
