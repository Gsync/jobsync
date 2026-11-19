import type { UIMessage } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";

// Approximates what a message costs the model after conversion. data-* parts
// are excluded because convertToModelMessages drops them — without that a
// 120k paste chip would evict the entire real history to make room for text
// the model never sees. Serializing the parts over-counts by the JSON
// structure, which errs toward cutting early.
function estimateTokens(message: UIMessage): number {
  const parts = (message.parts ?? []).filter(
    (part) => !part.type.startsWith("data-"),
  );
  if (parts.length === 0) return 0;
  return Math.ceil(
    JSON.stringify(parts).length / APP_CONSTANTS.AGENT_CHAT_CHARS_PER_TOKEN,
  );
}

export function windowStart(messages: UIMessage[], budget: number): number {
  const cap = APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES;
  const costs = messages.map(estimateTokens);
  let start = 0;
  let tokens = 0;
  for (let end = 0; end < messages.length; end++) {
    tokens += costs[end];
    if (tokens <= budget && end - start + 1 <= cap) continue;

    // Keep the newest message when no later user fits both low-water marks.
    while (start < end) {
      tokens -= costs[start];
      start++;
      if (
        messages[start].role === "user" &&
        tokens <= budget * 0.6 &&
        end - start + 1 <= cap * 0.6
      ) break;
    }
  }
  return start;
}

// Slice before conversion so a tool call and its result stay together.
export function windowMessages(messages: UIMessage[]): UIMessage[] {
  return messages.slice(windowStart(messages, APP_CONSTANTS.AGENT_CHAT_HISTORY_TOKEN_BUDGET));
}
