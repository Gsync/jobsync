import "server-only";

import { streamText, type LanguageModel, type UIMessageStreamWriter } from "ai";
import { AGENT_NESTED_STREAM_PART_TYPE } from "@/models/agent.model";
import {
  genAiRequestAttrs,
  genAiResponseAttrs,
  log,
  runInSpan,
  startSpan,
  type Surface,
} from "@/lib/telemetry";
import {
  addOllamaTimings,
  ollamaTimingAttrs,
  readOllamaTimings,
  type OllamaTimings,
} from "@/lib/ai/ollamaTimings";
import { startAiCall } from "@/lib/aiUsage/tracker";
import type { AiUsageFeature } from "@/models/aiUsage.model";

export type NestedGenerationResult =
  | { status: "ok"; text: string }
  | { status: "incomplete" }
  | { status: "busy" }
  | { status: "failed"; timedOut?: true };

// One per request, created by the chat route. Process-wide state would block
// one user behind another's generation. elapsedMs is what the turn subtracts
// so its own duration excludes the nested work recorded separately.
export type NestedGenerationGuard = { running: boolean; elapsedMs: number };

type NestedGenerationArgs = {
  model: LanguageModel;
  system: string;
  prompt: string;
  temperature: number;
  numCtx: number;
  timeoutMs: number;
  writer: UIMessageStreamWriter;
  toolCallId: string;
  abortSignal?: AbortSignal;
  guard: NestedGenerationGuard;
  label: string;
  feature: AiUsageFeature;
  surface: Surface;
  provider: string;
  modelName: string;
  userId: string;
  // Call-site facts the invariant half cannot know: input sizes and whether
  // the caller clipped what it sent.
  attrs?: Record<string, unknown>;
  // Called once the guard accepts the call, so a "busy" rejection never
  // announces a generation that did not start.
  report: (step: "generate") => void;
};

/**
 * The invariant half of an agent-as-tool: run a second generation with its own
 * context window, stream its tokens to the transcript, and report whether it
 * finished. Callers own everything that differs in KIND — ownership,
 * preprocessing, parsing, saving, and the tool's result shape.
 */
export async function runNestedGeneration({
  model,
  system,
  prompt,
  temperature,
  numCtx,
  timeoutMs,
  writer,
  toolCallId,
  abortSignal,
  guard,
  label,
  feature,
  surface,
  provider,
  modelName,
  userId,
  attrs,
  report,
}: NestedGenerationArgs): Promise<NestedGenerationResult> {
  // Started before the guard check so a rejected call is visible too — "busy"
  // is exactly the outcome you go looking for when a review never appeared.
  const span = startSpan(`agent.nested.${label}`, {
    ...genAiRequestAttrs({
      provider,
      model: modelName,
      temperature,
      numCtx,
      surface,
      system,
      prompt,
    }),
    ...attrs,
  });

  // Terminal tools stop the loop after a step, not within one: the model can
  // still emit both nested tools in a single step, and two long sub-calls
  // serialize on Ollama past the 360s turn deadline, losing both.
  if (guard.running) {
    span.end({ "jobsync.nested.status": "busy" });
    return { status: "busy" };
  }
  guard.running = true;
  report("generate");

  return runInSpan(span, async () => {
    // Own deadline, plus the outer turn's signal so closing the panel aborts
    // this too.
    const deadline = AbortSignal.timeout(timeoutMs);
    const signals: AbortSignal[] = [deadline];
    if (abortSignal) signals.push(abortSignal);
    const signal = AbortSignal.any(signals);

    const startedAt = Date.now();
    const tracker = startAiCall({
      userId,
      feature,
      provider,
      model: modelName,
      numCtx,
    });

    let timings: OllamaTimings | undefined;
    function endGeneration(status: "ok" | "incomplete" | "failed", responseAttrs: Record<string, unknown> = {}) {
      log.info("[agent-chat] nested generation", { label, status, ...timings });
      span.end({ "jobsync.nested.status": status, ...responseAttrs, ...ollamaTimingAttrs(timings) });
    }

    let text = "";
    // The SDK reports the provider's failure here, then rejects finishReason
    // with a generic NoOutputGeneratedError that hides it.
    let providerError: unknown;
    try {
      const sub = streamText({
        model,
        instructions: system,
        prompt,
        temperature,
        abortSignal: signal,
        include: { rawChunks: true },
        onError: ({ error }) => {
          providerError = error;
        },
        onChunk: ({ chunk }) => {
          if (chunk.type !== "raw") return;
          const step = readOllamaTimings(chunk.rawValue);
          if (step) timings = addOllamaTimings(timings, step);
        },
        // Deliberately no think:true. These sub-calls have no tools, so
        // reasoning buys nothing and costs 30s. The chat loop enables it.
        providerOptions: {
          ollama: { options: { num_ctx: numCtx } },
          openaiCompatible: { chat_template_kwargs: { enable_thinking: false } },
        },
      });

      for await (const delta of sub.textStream) {
        tracker.markFirstToken();
        text += delta;
        writer.write({
          type: AGENT_NESTED_STREAM_PART_TYPE,
          id: toolCallId,
          data: { delta },
          transient: true,
        });
      }

      // The stream running out is not the generation finishing, and neither
      // case throws: an abort ends textStream cleanly and rejects this
      // promise, and a body that stops without its done chunk resolves to
      // "other" (Ollama) or "interrupted" (DeepSeek, OpenAI).
      const finishReason = await sub.finishReason;
      // Defensively: an aborted stream rejects this, the same trap the
      // finishReason guard exists for.
      const tokens = await Promise.resolve(sub.usage).catch(() => undefined);
      void tracker.finish({ usage: tokens, finishReason });
      if (finishReason !== "stop") {
        // An in-stream error chunk resolves to "error" instead of rejecting.
        if (providerError) {
          log.warn(`[agent-chat] ${label} stream error`, { error: String(providerError) });
        }
        span.setError(providerError ?? new Error(`finishReason=${finishReason}`));
        endGeneration("incomplete", genAiResponseAttrs({ finishReason }));
        return { status: "incomplete" };
      }

      endGeneration("ok", genAiResponseAttrs({ usage: tokens, finishReason, text }));
      return { status: "ok", text };
    } catch (caught) {
      const error = providerError ?? caught;
      void tracker.finish({ error, abortedBy: signal });
      log.error(`[agent-chat] ${label} generation failed`, { error: String(error) });
      span.setError(error);
      endGeneration("failed");
      if (deadline.aborted && !abortSignal?.aborted) {
        return { status: "failed", timedOut: true };
      }
      return { status: "failed" };
    } finally {
      guard.elapsedMs += Date.now() - startedAt;
      guard.running = false;
    }
  });
}
