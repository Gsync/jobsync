import "server-only";

import db from "@/lib/db";
import { log } from "@/lib/telemetry";
import type { AiCallStatus, AiUsageFeature } from "@/models/aiUsage.model";

export type TokenUsage = { inputTokens?: number; outputTokens?: number };

export type AiCallFinish = {
  usage?: TokenUsage;
  finishReason?: string;
  error?: unknown;
  // Pass the call's signal on the abort/error path; it only counts if fired.
  abortedBy?: AbortSignal;
  // Time spent inside nested generations, which carry their own rows.
  excludeMs?: number;
};

export type AiCallTracker = {
  markFirstToken(): void;
  finish(input: AiCallFinish): Promise<void>;
};

export function statusOf(input: AiCallFinish): AiCallStatus {
  if (input.abortedBy?.aborted) {
    // AbortSignal.timeout and AbortSignal.any both surface the firing
    // signal's reason, so a deadline reads the same at every call site.
    const reason = input.abortedBy.reason as { name?: string } | undefined;
    return reason?.name === "TimeoutError" ? "timed_out" : "stopped";
  }
  if (input.error !== undefined) return "error";
  switch (input.finishReason) {
    case "stop":
    case "tool-calls":
      return "ok";
    case "length":
      return "truncated";
    case "error":
    case "content-filter":
      return "error";
    default:
      // "other" / missing: Ollama's body ended without its done chunk.
      return "interrupted";
  }
}

export function usageOfSteps(
  steps: readonly { usage: TokenUsage }[],
): TokenUsage | undefined {
  if (steps.length === 0) return undefined;
  return steps.reduce<Required<TokenUsage>>(
    (sum, step) => ({
      inputTokens: sum.inputTokens + (step.usage.inputTokens ?? 0),
      outputTokens: sum.outputTokens + (step.usage.outputTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0 },
  );
}

export function startAiCall(start: {
  userId: string;
  feature: AiUsageFeature;
  provider: string;
  model: string;
  numCtx?: number;
}): AiCallTracker {
  const startedAt = new Date();
  let firstTokenMs: number | undefined;
  let finished = false;

  return {
    markFirstToken() {
      if (firstTokenMs === undefined) {
        firstTokenMs = Date.now() - startedAt.getTime();
      }
    },
    async finish(input) {
      // Several callbacks can report one call (onError then onFinish).
      if (finished) return;
      finished = true;
      try {
        const elapsed = Date.now() - startedAt.getTime();
        await db.aiCall.create({
          data: {
            userId: start.userId,
            feature: start.feature,
            provider: start.provider,
            model: start.model,
            status: statusOf(input),
            inputTokens: input.usage?.inputTokens ?? null,
            outputTokens: input.usage?.outputTokens ?? null,
            durationMs: Math.max(0, elapsed - (input.excludeMs ?? 0)),
            firstTokenMs: firstTokenMs ?? null,
            numCtx: start.provider === "ollama" ? (start.numCtx ?? null) : null,
            startedAt,
          },
        });
      } catch (error) {
        // Usage is bookkeeping; it must never fail the call it describes.
        log.warn("[AiUsage] Failed to record call", { error: String(error) });
      }
    },
  };
}
