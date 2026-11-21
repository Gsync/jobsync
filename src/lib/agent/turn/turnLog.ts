import { isToolUIPart, type LanguageModelUsage, type UIMessage } from "ai";
import { ollamaTimingAttrs, type OllamaTimings } from "@/lib/ai/ollamaTimings";
import { genAiResponseAttrs, log, runInSpan, type Span } from "@/lib/telemetry";
import type { TurnPrefixMetrics } from "./turnMetrics";

export type TurnLogFields = TurnPrefixMetrics & Partial<OllamaTimings> & {
  provider: string;
  model: string;
  tool: string | null;
  toolState: string | null;
  outcome: string;
  aborted: boolean;
  pasteChars: number;
  messageCount: number;
  historyDropped: number;
  maxStepPromptTokens?: number;
  maxStepOutputTokens?: number;
};

// One structured line per turn. Sizes and outcomes only — never the pasted
// posting and never the extracted arguments.
export function logTurn(fields: TurnLogFields) {
  log.info("[agent-chat] turn", fields);
}

export function endTurnSpan(span: Span, fields: TurnLogFields, response: {
  usage?: LanguageModelUsage;
  finishReason?: string;
}) {
  // Restore the trace context for the turn log.
  runInSpan(span, () => logTurn(fields));
  // Keep turn measurements queryable alongside tool spans.
  span.end({ ...genAiResponseAttrs(response), ...turnSpanAttrs(fields) });
}

export function outcomeOf(message: UIMessage | undefined): {
  tool: string | null;
  state: string | null;
  outcome: string;
} {
  for (const part of message?.parts ?? []) {
    if (!isToolUIPart(part)) continue;
    const tool = part.type.replace(/^tool-/, "");
    if (part.state !== "output-available") {
      return { tool, state: part.state, outcome: part.state };
    }
    const output = part.output as
      | { status?: string; created?: boolean; validationError?: string }
      | undefined;
    // Discriminated on shape, not on tool name: a name allowlist logged a
    // resume read as "duplicate" once already. Status-carrying results report
    // their own outcome, and add_job is the only shape without a status field,
    // so it is the fallback rather than the default.
    if (typeof output?.status === "string") {
      return { tool, state: part.state, outcome: output.status };
    }
    const outcome = output?.validationError
      ? "validation"
      : output?.created
        ? "created"
        : "duplicate";
    return { tool, state: part.state, outcome };
  }
  return { tool: null, state: null, outcome: "none" };
}

export function buildTurnLogFields({
  responseMessage, prefixMetrics, ...fields
}: Pick<TurnLogFields, "provider" | "model" | "aborted" | "pasteChars" | "messageCount" | "historyDropped"> & {
  responseMessage: UIMessage;
  prefixMetrics?: TurnPrefixMetrics;
}): TurnLogFields {
  const { tool, state, outcome } = outcomeOf(responseMessage);
  return {
    ...fields,
    tool,
    toolState: state,
    outcome,
    // What was actually sent. prefixChanged is the cache signal: the
    // system prompt and tool material must stay byte-identical within a
    // conversation or Ollama recomputes the whole prefix.
    systemChars: prefixMetrics?.systemChars ?? 0,
    toolChars: prefixMetrics?.toolChars ?? 0,
    messageChars: prefixMetrics?.messageChars ?? 0,
    sharedPrefixChars: prefixMetrics?.sharedPrefixChars ?? 0,
    prefixChanged: prefixMetrics?.prefixChanged ?? false,
  };
}

export function turnSpanAttrs(fields: TurnLogFields) {
  return {
    "jobsync.tool": fields.tool,
    "jobsync.tool_state": fields.toolState,
    "jobsync.outcome": fields.outcome,
    "jobsync.aborted": fields.aborted,
    "jobsync.paste_chars": fields.pasteChars,
    "jobsync.message_count": fields.messageCount,
    "jobsync.history_dropped": fields.historyDropped,
    "jobsync.system_chars": fields.systemChars,
    "jobsync.tool_chars": fields.toolChars,
    "jobsync.message_chars": fields.messageChars,
    ...ollamaTimingAttrs(fields),
    ...(fields.maxStepPromptTokens !== undefined && {
      "jobsync.max_step_prompt_tokens": fields.maxStepPromptTokens,
    }),
    ...(fields.maxStepOutputTokens !== undefined && {
      "jobsync.max_step_output_tokens": fields.maxStepOutputTokens,
    }),
    "jobsync.shared_prefix_chars": fields.sharedPrefixChars,
    "jobsync.prefix_changed": fields.prefixChanged,
  };
}
