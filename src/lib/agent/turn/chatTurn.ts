import "server-only";

import {
  createUIMessageStream, isStepCount, streamText, toUIMessageStream,
  type LanguageModel, type LanguageModelUsage, type ModelMessage, type UIMessage, type UIMessageChunk,
} from "ai";
import { APP_CONSTANTS, TEMPERATURES } from "@/lib/constants";
import type { AiConfig } from "@/lib/ai/aiConfig";
import { addOllamaTimings, readOllamaTimings, type OllamaTimings } from "@/lib/ai/ollamaTimings";
import { startAiCall, usageOfSteps, type TokenUsage } from "@/lib/aiUsage/tracker";
import { genAiRequestAttrs, runInSpan, startSpan, SURFACES } from "@/lib/telemetry";
import type { PageContext } from "@/models/agent.model";
import { mapAgentError } from "../errors";
import { AGENT_CHAT_SYSTEM_PROMPT } from "../prompt";
import type { NestedGenerationGuard } from "../steps/nestedGeneration";
import { buildAgentStopWhen, buildAgentToolApproval, buildAgentTools } from "../tools";
import { persistTurn } from "./persistTurn";
import { directCallFor, runToolDirect, type DirectRun } from "./runToolDirect";
import { measureTurnPrefix, type TurnPrefixMetrics } from "./turnMetrics";
import { buildTurnLogFields, endTurnSpan } from "./turnLog";

export function runChatTurn(input: {
  userId: string;
  messages: UIMessage[];
  modelMessages: ModelMessage[];
  historyDropped: number;
  pageContext?: PageContext;
  pastedText?: string;
  ai: AiConfig & { model: LanguageModel };
  requestSignal: AbortSignal;
}): ReadableStream<UIMessageChunk> {
  const { userId, messages, modelMessages, historyDropped, pageContext, pastedText, requestSignal } = input;
  const { provider, modelName, model, numCtx } = input.ai;
  const errorContext = { provider, model: modelName };

  // A client disconnect must cancel the model and its nested tools.
  const turnSignal = AbortSignal.any([
    requestSignal,
    AbortSignal.timeout(APP_CONSTANTS.AGENT_CHAT_TIMEOUT_MS),
  ]);

  // Written inside execute, read in onEnd, which runs after it.
  let timings: OllamaTimings | undefined;
  const stepMax: { maxStepPromptTokens?: number; maxStepOutputTokens?: number } = {};
  let prefixMetrics: TurnPrefixMetrics | undefined;

  // The inner onEnd totals all steps before the outer onEnd records usage.
  let turnUsage: LanguageModelUsage | undefined;
  let turnFinishReason: string | undefined;
  // On abort only completed steps report usage.
  let turnAbortUsage: TokenUsage | undefined;

  // Nested calls record their own time, which the turn subtracts.
  const nestedGuard: NestedGenerationGuard = { running: false, elapsedMs: 0 };

  let turnUsageTracker: ReturnType<typeof startAiCall> | undefined;
  let direct: Promise<DirectRun> | undefined;

  const turnSpan = startSpan("agent.chat.turn", {
    ...genAiRequestAttrs({
      provider,
      model: modelName,
      temperature: TEMPERATURES.ANALYSIS,
      numCtx,
      surface: SURFACES.AGENT_CHAT,
      system: AGENT_CHAT_SYSTEM_PROMPT,
      prompt: modelMessages,
    }),
    "jobsync.user_id": userId,
  });

  // The SDK rewraps mapped errors. Log each failure once across both streams.
  const alreadyMapped = new Set<string>();
  // A provider connection failure bypasses streamText's onEnd.
  let turnError: unknown;
  const mapTurnError = (error: unknown): string =>
    runInSpan(turnSpan, () => {
      turnError ??= error;
      const message = error instanceof Error ? error.message : "";
      if (alreadyMapped.has(message)) return message;
      const mapped = mapAgentError(error, errorContext);
      alreadyMapped.add(mapped);
      return mapped;
    });

  return createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) =>
      runInSpan(turnSpan, async () => {
        const tools = buildAgentTools({
          userId,
          pastedText,
          pageContext,
          model,
          provider,
          modelName,
          writer,
          nestedGuard,
        });
        const toolApproval = buildAgentToolApproval(pastedText);
        const call = directCallFor(messages.at(-1));
        direct = call ? runToolDirect({
          call, tools, toolApproval, writer, messages: modelMessages, abortSignal: turnSignal, onError: mapTurnError,
        }) : undefined;
        const routedMessages = direct ? (await direct).messages : modelMessages;
        if (!routedMessages) return;
        turnUsageTracker = startAiCall({ userId, feature: "agent_chat", provider, model: modelName, numCtx });
        prefixMetrics = measureTurnPrefix({
          userId,
          system: AGENT_CHAT_SYSTEM_PROMPT,
          tools,
          modelMessages: routedMessages,
        });
        const result = streamText({
          model,
          instructions: AGENT_CHAT_SYSTEM_PROMPT,
          messages: routedMessages,
          tools,
          toolApproval,
          stopWhen: [isStepCount(APP_CONSTANTS.AGENT_CHAT_MAX_STEPS), ...buildAgentStopWhen()],
          // Argument extraction wants determinism.
          temperature: TEMPERATURES.ANALYSIS,
          abortSignal: turnSignal,
          providerOptions: {
            // qwen3.5 selected add_job 7/7 with thinking enabled versus 1/7 without.
            ollama: { think: true, ...(numCtx !== undefined && { options: { num_ctx: numCtx } }) },
            // Replay history as text, not item_references to OpenAI storage.
            openai: { store: false },
          },
          include: { rawChunks: true },
          onStepEnd: ({ usage }) => {
            if (usage.inputTokens !== undefined) {
              stepMax.maxStepPromptTokens = Math.max(stepMax.maxStepPromptTokens ?? 0, usage.inputTokens);
            }
            if (usage.outputTokens !== undefined) {
              stepMax.maxStepOutputTokens = Math.max(stepMax.maxStepOutputTokens ?? 0, usage.outputTokens);
            }
          },
          // Only visible output counts. Ollama also emits empty deltas while thinking.
          onChunk: ({ chunk }) => {
            if (chunk.type === "raw") {
              const step = readOllamaTimings(chunk.rawValue);
              if (step) timings = addOllamaTimings(timings, step);
              return;
            }
            if (
              (chunk.type === "text-delta" && chunk.text.length > 0) ||
              chunk.type === "tool-input-start"
            ) {
              turnUsageTracker?.markFirstToken();
            }
          },
          onAbort: ({ steps }) => {
            turnAbortUsage = usageOfSteps(steps);
          },
          // Capture the model result before the outer stream ends the span.
          onEnd: ({ usage, finishReason }) => {
            turnUsage = usage;
            turnFinishReason = finishReason;
          },
        });
        // The merged stream supplies start/finish and catches its own errors.
        writer.merge(
          toUIMessageStream({
            stream: result.stream,
            tools,
            onError: mapTurnError,
          }),
        );
      }),
    onEnd: async ({ messages: finalMessages, responseMessage, isAborted }) => {
      const fields = {
        ...buildTurnLogFields({
          provider, model: modelName, responseMessage, aborted: isAborted,
          pasteChars: pastedText?.length ?? 0, messageCount: finalMessages.length,
          historyDropped, prefixMetrics,
        }),
        ...timings,
        ...stepMax,
      };
      endTurnSpan(turnSpan, fields, { usage: turnUsage, finishReason: turnFinishReason });
      // Cancellation can fire before the SDK sets isAborted.
      const aborted = isAborted || turnSignal.aborted;
      void turnUsageTracker?.finish({
        usage: aborted ? turnAbortUsage : turnUsage,
        finishReason: turnFinishReason,
        error: turnError,
        abortedBy: turnSignal,
        excludeMs: nestedGuard.elapsedMs,
      });
      // A disconnect ends the stream while a direct write may still be running.
      // Its failure already reached the stream's onError.
      const committed = aborted ? (await direct?.catch(() => undefined))?.committed : undefined;
      await persistTurn({ messages, finalMessages, aborted, committed });
    },
    // The outer stream passes the error directly.
    onError: mapTurnError,
  });
}
