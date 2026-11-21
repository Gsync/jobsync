import "server-only";

import db from "@/lib/db";
import { numCtxFor, type AiSurface } from "./numCtx";
import type { ProviderType } from "./providers";
import {
  AiProvider,
  OllamaModel,
  OpenaiModel,
  DeepseekModel,
  GeminiModel,
} from "@/models/ai.model";
import {
  defaultUserSettings,
  type AiSettings,
} from "@/models/userSettings.model";

export function getDefaultModelForProvider(provider: AiProvider): string {
  switch (provider) {
    case AiProvider.OLLAMA:
      return OllamaModel.QWEN3_5_9B;
    case AiProvider.OPENAI:
      return OpenaiModel.GPT4O_MINI;
    case AiProvider.DEEPSEEK:
      return DeepseekModel.DEEPSEEK_CHAT;
    case AiProvider.GEMINI:
      return GeminiModel.GEMINI_2_0_FLASH;
    case AiProvider.OPENROUTER:
      return "anthropic/claude-3.5-sonnet";
  }
}

export async function getUserAiSettings(userId: string): Promise<AiSettings> {
  const userSettings = await db.userSettings.findUnique({
    where: { userId },
  });

  if (!userSettings) {
    return defaultUserSettings.ai;
  }

  const settings = JSON.parse(userSettings.settings);
  return {
    ...defaultUserSettings.ai,
    ...settings.ai,
  };
}

export type AiConfig = { provider: ProviderType; modelName: string; numCtx?: number };

type Resolved = { ok: true; config: AiConfig; configuredModel?: string };
type NoModel = { ok: false; reason: "no_model" };

export function resolveAiConfig(userId: string, surface: AiSurface): Promise<Resolved>;
export function resolveAiConfig(
  userId: string, surface: AiSurface, options: { requireConfigured?: boolean },
): Promise<Resolved | NoModel>;
export async function resolveAiConfig(
  userId: string, surface: AiSurface, options?: { requireConfigured?: boolean },
): Promise<Resolved | NoModel> {
  const { provider, model } = await getUserAiSettings(userId);
  if (options?.requireConfigured && !model) return { ok: false, reason: "no_model" };

  const numCtx = numCtxFor(surface);
  return {
    ok: true,
    configuredModel: model,
    config: {
      provider,
      modelName: model || getDefaultModelForProvider(provider),
      ...(numCtx !== undefined && { numCtx }),
    },
  };
}
