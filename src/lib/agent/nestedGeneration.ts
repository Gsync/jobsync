import "server-only";

import { streamText, type LanguageModel, type UIMessageStreamWriter } from "ai";
import { AGENT_NESTED_STREAM_PART_TYPE } from "@/models/agent.model";
import {
  genAiRequestAttrs,
  genAiResponseAttrs,
  log,
  runInSpan,
  startSpan,
  SURFACE_BY_NESTED_LABEL,
  SURFACES,
} from "@/lib/telemetry";

export type NestedGenerationResult =
  | { status: "ok"; text: string }
  | { status: "incomplete" }
  | { status: "busy" }
  | { status: "failed" };

// One per request, created in buildAgentTools. Process-wide state would block
// one user behind another's generation.
export type NestedGenerationGuard = { running: boolean };

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
  provider: string;
  modelName: string;
  // Call-site facts the invariant half cannot know: input sizes and whether
  // the caller clipped what it sent.
  attrs?: Record<string, unknown>;
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
  provider,
  modelName,
  attrs,
}: NestedGenerationArgs): Promise<NestedGenerationResult> {
  // Started before the guard check so a rejected call is visible too — "busy"
  // is exactly the outcome you go looking for when a review never appeared.
  const span = startSpan(`agent.nested.${label}`, {
    ...genAiRequestAttrs({
      provider,
      model: modelName,
      temperature,
      numCtx,
      surface: SURFACE_BY_NESTED_LABEL[label] ?? SURFACES.AGENT_CHAT,
      system,
      prompt,
    }),
    ...attrs,
  });

  // Terminal tools stop the loop after a step, not within one: the model can
  // still emit both nested tools in a single step, and two 180s sub-calls
  // serialize on Ollama past the 300s turn deadline, losing both.
  if (guard.running) {
    span.end({ "jobsync.nested.status": "busy" });
    return { status: "busy" };
  }
  guard.running = true;

  return runInSpan(span, async () => {
    // Own deadline, plus the outer turn's signal so closing the panel aborts
    // this too.
    const signals: AbortSignal[] = [AbortSignal.timeout(timeoutMs)];
    if (abortSignal) signals.push(abortSignal);

    let text = "";
    try {
      const sub = streamText({
        model,
        system,
        prompt,
        temperature,
        abortSignal: AbortSignal.any(signals),
        // Deliberately no think:true. These sub-calls have no tools, so
        // reasoning buys nothing and costs 30s. The chat loop enables it.
        providerOptions: { ollama: { options: { num_ctx: numCtx } } },
      });

      for await (const delta of sub.textStream) {
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
      // promise, and a body that stops without Ollama's done chunk resolves
      // to "other".
      const finishReason = await sub.finishReason;
      if (finishReason !== "stop") {
        span.setError(new Error(`finishReason=${finishReason}`));
        span.end({
          "jobsync.nested.status": "incomplete",
          ...genAiResponseAttrs({ finishReason }),
        });
        return { status: "incomplete" };
      }

      // Only on the ok path, and defensively: an aborted stream rejects this,
      // the same trap the finishReason guard above exists for.
      const usage = await Promise.resolve(sub.totalUsage).catch(() => undefined);
      span.end({
        "jobsync.nested.status": "ok",
        ...genAiResponseAttrs({ usage, finishReason, text }),
      });
      return { status: "ok", text };
    } catch (error) {
      log.error(`[agent-chat] ${label} generation failed`, { error: String(error) });
      span.setError(error);
      span.end({ "jobsync.nested.status": "failed" });
      return { status: "failed" };
    } finally {
      guard.running = false;
    }
  });
}
