import "server-only";

import { generateText, type FinishReason, type LanguageModel, type LanguageModelUsage } from "ai";
import { startAiCall } from "@/lib/aiUsage/tracker";
import { genAiRequestAttrs, genAiResponseAttrs, withSpan, type Surface } from "@/lib/telemetry";
import type { AiUsageFeature } from "@/models/aiUsage.model";

export type TrackedAi = {
  provider: string;
  modelName: string;
  model: LanguageModel;
  numCtx?: number;
};

export async function runTrackedGeneration(input: {
  userId: string;
  feature: AiUsageFeature;
  spanName: string;
  surface: Surface;
  ai: TrackedAi;
  system: string;
  prompt: string;
  temperature: number;
  abortSignal?: AbortSignal;
  attrs?: Record<string, unknown>;
}): Promise<{ text: string; usage: LanguageModelUsage; finishReason: FinishReason }> {
  const { ai, surface, system, prompt, temperature, abortSignal } = input;
  const request = { provider: ai.provider, model: ai.modelName, numCtx: ai.numCtx };
  const attrs = { ...genAiRequestAttrs({ ...request, surface, system, prompt, temperature }), ...input.attrs };

  return withSpan(input.spanName, attrs, async (span) => {
    const tracker = startAiCall({ userId: input.userId, feature: input.feature, ...request });
    let generated;
    try {
      generated = await generateText({
        model: ai.model,
        instructions: system,
        prompt,
        temperature,
        abortSignal,
        ...(ai.numCtx !== undefined && {
          providerOptions: { ollama: { options: { num_ctx: ai.numCtx } } },
        }),
      });
    } catch (error) {
      void tracker.finish({ error, abortedBy: abortSignal });
      throw error;
    }

    const { text, usage, finishReason } = generated;
    void tracker.finish({ usage, finishReason, abortedBy: abortSignal });
    span.setAttrs(genAiResponseAttrs({ text, usage, finishReason }));
    return { text, usage, finishReason };
  });
}
