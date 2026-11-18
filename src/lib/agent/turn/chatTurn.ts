import "server-only";

import {
  createUIMessageStream, isStepCount, streamText, toUIMessageStream,
  type LanguageModel, type LanguageModelUsage, type ModelMessage, type UIMessage, type UIMessageChunk,
} from "ai";
import { saveChatConversation } from "@/actions/agentChat.actions";
import { APP_CONSTANTS, TEMPERATURES } from "@/lib/constants";
import type { ProviderType } from "@/lib/ai/providers";
import { addOllamaTimings, readOllamaTimings, type OllamaTimings } from "@/lib/ai/ollamaTimings";
import { startAiCall, usageOfSteps, type TokenUsage } from "@/lib/aiUsage/tracker";
import { genAiRequestAttrs, genAiResponseAttrs, runInSpan, startSpan, SURFACES } from "@/lib/telemetry";
import type { PageContext } from "@/models/agent.model";
import { mapAgentError } from "../errors";
import { stubConsumedPastes } from "../memory/paste";
import { AGENT_CHAT_SYSTEM_PROMPT } from "../prompt";
import type { NestedGenerationGuard } from "../steps/nestedGeneration";
import { buildAgentStopWhen, buildAgentToolApproval, buildAgentTools } from "../tools";
import { measureTurnPrefix, type TurnPrefixMetrics } from "./turnMetrics";
import { buildTurnLogFields, logTurn, turnSpanAttrs } from "./turnLog";

export function runChatTurn(input: {
  userId: string;
  messages: UIMessage[];
  modelMessages: ModelMessage[];
  historyDropped: number;
  pageContext?: PageContext;
  pastedText?: string;
  ai: { provider: ProviderType; modelName: string; model: LanguageModel };
  requestSignal: AbortSignal;
}): ReadableStream<UIMessageChunk> {
  const { userId, messages, modelMessages, historyDropped, pageContext, pastedText, requestSignal } = input;
  const { provider, modelName, model } = input.ai;
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

  const turnUsageTracker = startAiCall({
    userId,
    feature: "agent_chat",
    provider,
    model: modelName,
    numCtx: APP_CONSTANTS.AGENT_CHAT_NUM_CTX,
  });

  const turnSpan = startSpan("agent.chat.turn", {
    ...genAiRequestAttrs({
      provider,
      model: modelName,
      temperature: TEMPERATURES.ANALYSIS,
      numCtx: APP_CONSTANTS.AGENT_CHAT_NUM_CTX,
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
      runInSpan(turnSpan, () => {
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
        prefixMetrics = measureTurnPrefix({
          userId,
          system: AGENT_CHAT_SYSTEM_PROMPT,
          tools,
          modelMessages,
        });
        const result = streamText({
          model,
          instructions: AGENT_CHAT_SYSTEM_PROMPT,
          messages: modelMessages,
          tools,
          toolApproval: buildAgentToolApproval(pastedText),
          stopWhen: [isStepCount(APP_CONSTANTS.AGENT_CHAT_MAX_STEPS), ...buildAgentStopWhen()],
          // Argument extraction wants determinism.
          temperature: TEMPERATURES.ANALYSIS,
          abortSignal: turnSignal,
          providerOptions: {
            // qwen3.5 selected add_job 7/7 with thinking enabled versus 1/7 without.
            ollama: { think: true, options: { num_ctx: APP_CONSTANTS.AGENT_CHAT_NUM_CTX } },
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
              turnUsageTracker.markFirstToken();
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
      // Restore the trace context for the turn log.
      runInSpan(turnSpan, () => logTurn(fields));
      // Keep turn measurements queryable alongside tool spans.
      turnSpan.end({
        ...genAiResponseAttrs({ usage: turnUsage, finishReason: turnFinishReason }),
        ...turnSpanAttrs(fields),
      });
      // Cancellation can fire before the SDK sets isAborted.
      const aborted = isAborted || turnSignal.aborted;
      void turnUsageTracker.finish({
        usage: aborted ? turnAbortUsage : turnUsage,
        finishReason: turnFinishReason,
        error: turnError,
        abortedBy: turnSignal,
        excludeMs: nestedGuard.elapsedMs,
      });
      // Saving after Clear would restore the deleted conversation.
      if (isAborted) return;
      // Stubbing happens here so it lives in exactly one place.
      await saveChatConversation(stubConsumedPastes(finalMessages));
    },
    // The outer stream passes the error directly.
    onError: mapTurnError,
  });
}
