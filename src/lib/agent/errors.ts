import {
  APICallError,
  InvalidToolApprovalError,
  InvalidToolInputError,
  NoSuchToolError,
  RetryError,
  ToolCallNotFoundForApprovalError,
} from "ai";
import { AIUnavailableError, MissingCredentialError } from "@/lib/ai";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import { log } from "@/lib/telemetry";

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

// A retryable status arrives wrapped: the SDK exhausts its retries and throws
// a RetryError whose lastError carries the provider's status code.
function statusOf(error: unknown): number | undefined {
  if (RetryError.isInstance?.(error)) return statusOf(error.lastError);
  if (APICallError.isInstance?.(error)) return error.statusCode;
  return undefined;
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
  log.error("[agent-chat] error", {
    error: String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  if (error instanceof AIUnavailableError) return error.message;

  if (error instanceof MissingCredentialError) {
    const entry = PROVIDER_REGISTRY[provider];
    if (entry?.credentialType === "base-url") {
      return `No base URL is set for ${entry.displayName}. Add one in Settings → API Keys, or switch provider.`;
    }
    return `No API key is set for ${provider}. Add one in Settings, or switch provider.`;
  }

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

  if (provider === "openai-compatible" && /context length|context size|exceeds the available context|tokens to keep/i.test(message)) {
    return `The prompt is longer than the context ${model ?? "the model"} was loaded with. Raise its context length to at least 16k in your server.`;
  }

  const status = statusOf(error);

  if (status === 429) {
    return `${provider}${model ? ` / ${model}` : ""} is rate-limited right now. Wait a moment and ask again, or pick another model in Settings.`;
  }

  if (status === 401 && provider === "openai-compatible") {
    return `${provider} rejected the request. Its API key is OPENAI_COMPATIBLE_API_KEY on the JobSync server, sent only when the saved URL matches OPENAI_COMPATIBLE_BASE_URL.`;
  }

  if (status === 401) {
    return `${provider} rejected the API key. Re-save it in Settings.`;
  }

  // OpenRouter phrases this as a 404 from its tool-compatibility routing step
  if (
    /does not support tools|no endpoints found that support tool|tool (use|calling) (is )?not supported|no tools support/i.test(
      message,
    )
  ) {
    return `${provider}${model ? ` / ${model}` : ""} cannot use tools, so it cannot review a resume, match a job, write a cover letter or add a job. Pick a tool-capable model in Settings.`;
  }

  // After the tool check: OpenRouter's no-tools answer is also a 404
  if (status === 404) {
    return `${provider}${model ? ` / ${model}` : ""} isn't available to your API key. Pick another model in Settings.`;
  }

  if (NoSuchToolError.isInstance?.(error) || /NoSuchTool/i.test(name)) {
    return "The model asked for a tool that does not exist here. Try rephrasing your request.";
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
