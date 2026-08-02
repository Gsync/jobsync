import {
  InvalidToolApprovalError,
  InvalidToolInputError,
  NoSuchToolError,
  ToolCallNotFoundForApprovalError,
} from "ai";
import { AIUnavailableError } from "@/lib/ai";

type ErrorContext = { provider?: string; model?: string };

// The single fixed fallback. Never interpolate error.message into what the
// client sees — provider SDKs leak request context into their messages.
const GENERIC = "Something went wrong on that turn. Try asking again.";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

function nameOf(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

/**
 * One mapping shared by the route's pre-stream catch and by
 * toUIMessageStreamResponse's onError, so the same failure reads the same on
 * either side of the 200-response boundary.
 */
export function mapAgentError(
  error: unknown,
  context: ErrorContext = {},
): string {
  const provider = context.provider ?? "the AI provider";
  const model = context.model;
  const message = messageOf(error);
  const name = nameOf(error);

  // Always log the real error; only the mapped string crosses the wire.
  console.error("[agent-chat] error:", error);

  if (error instanceof AIUnavailableError) return error.message;

  if (
    name === "AbortError" ||
    name === "TimeoutError" ||
    /aborted|abort signal/i.test(message)
  ) {
    return "That response was stopped or took too long. Ask again to retry.";
  }

  if (
    InvalidToolApprovalError.isInstance?.(error) ||
    ToolCallNotFoundForApprovalError.isInstance?.(error) ||
    /ToolCallNotFoundForApproval|InvalidToolApproval/i.test(name)
  ) {
    return "That proposal has expired — the server no longer recognizes it. Use Clear and ask again.";
  }

  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ECONNRESET/i.test(message)) {
    return `Cannot reach ${provider}. Make sure the service is running, or switch provider in Settings.`;
  }

  if (
    /does not support tools|tool (use|calling) (is )?not supported|no tools support/i.test(
      message,
    )
  ) {
    return `${provider}${model ? ` / ${model}` : ""} cannot use tools, so it cannot add a job. Pick a tool-capable model in Settings.`;
  }

  if (NoSuchToolError.isInstance?.(error) || /NoSuchTool/i.test(name)) {
    return "The model asked for a tool that does not exist here. It only has one: adding a job.";
  }

  if (
    InvalidToolInputError.isInstance?.(error) ||
    /InvalidToolInput/i.test(name)
  ) {
    return "The model sent arguments that did not fit the tool. Try rephrasing your request.";
  }

  if (/maximum number of steps|step limit|stopWhen/i.test(message)) {
    return "The assistant stopped after reaching its step limit for this turn.";
  }

  return GENERIC;
}
