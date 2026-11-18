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

// Bounds what is SENT. AGENT_CHAT_MAX_STORED_MESSAGES bounds what is stored;
// the two are deliberately different numbers. If the cut lands mid-thread
// the model conversation may open with an assistant turn; providers tolerate
// that, but if the configured model chokes on it, trim forward to the first
// user message here rather than widening the window.
//
// The message count is a hard upper bound and the token budget cuts inside
// it. Cutting on UIMessage boundaries rather than after conversion is the
// safe order: here a tool call and its result are one part of one message,
// where in ModelMessage form they are separate messages and a cut can orphan
// the tool result.
export function windowMessages(messages: UIMessage[]): UIMessage[] {
  const recent = messages.slice(-APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES);

  const kept: UIMessage[] = [];
  let total = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const message = recent[i];
    total += estimateTokens(message);
    // The newest message goes in whatever it costs — a single oversized
    // review output must not window down to an empty conversation.
    if (total > APP_CONSTANTS.AGENT_CHAT_HISTORY_TOKEN_BUDGET && kept.length) {
      break;
    }
    kept.unshift(message);
  }
  return kept;
}
