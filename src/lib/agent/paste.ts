import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  isAgentPastePart,
  type AgentAddJobResult,
  type AgentPastePart,
} from "@/models/agent.model";

// Client-safe by design: no node:crypto here. truncateForModel lives in
// paste.server.ts so the composer and transcript can import these helpers.

// Newest unconsumed paste wins, but only while it is recent. A paste is only
// marked consumed by a successful create, so a paste the user moved past —
// pasted, then talked about something else — would otherwise splice itself
// into a later typed add and re-enter the prompt on every turn. Two user
// messages covers every designed flow: paste+ask in one message; paste →
// clarifying question → confirm; and cancel → queued correction → retry
// (approval responses are not user messages). Beyond the window the tool
// asks for a re-paste, which is visible and cheap. Symptom the window is too
// tight: the assistant asks the user to paste again mid-negotiation over a
// single posting — widen the constant, do not remove the bound.
export function resolvePastedText(messages: UIMessage[]): string | undefined {
  let userMessagesSeen = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === "user") {
      userMessagesSeen++;
      if (
        userMessagesSeen > APP_CONSTANTS.AGENT_CHAT_PASTE_ACTIVE_USER_MESSAGES
      ) {
        return undefined;
      }
    }
    const parts = message?.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j];
      if (isAgentPastePart(part) && !part.data.consumed) return part.data.text;
    }
  }
  return undefined;
}

function findConsumingWrite(
  messages: UIMessage[],
): { company?: string; jobTitle?: string } | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    for (const part of messages[i]?.parts ?? []) {
      if (!isToolUIPart(part) || part.state !== "output-available") continue;
      // add_job is the only tool that consumes a paste. Without this guard any
      // future tool returning created:true stubs the posting out from under it.
      if (getToolName(part) !== "add_job") continue;
      const output = part.output as AgentAddJobResult | undefined;
      // Only a successful create consumes the paste. A duplicate or a
      // validation failure leaves it available for the retry.
      if (!output?.created) continue;
      const input = part.input as
        | { company?: string; jobTitle?: string }
        | undefined;
      return { company: input?.company, jobTitle: input?.jobTitle };
    }
  }
  return undefined;
}

// Called from the persistence path so stubbing happens in exactly one place.
// Without it a conversation that added five jobs carries ~30KB of dead
// posting text forever, re-sent on every request.
export function stubConsumedPastes(messages: UIMessage[]): UIMessage[] {
  const write = findConsumingWrite(messages);
  if (!write) return messages;

  const label = `[pasted posting — saved as ${write.jobTitle ?? "a job"} at ${write.company ?? "a company"}]`;

  return messages.map((message) => ({
    ...message,
    parts: (message.parts ?? []).map((part) => {
      if (!isAgentPastePart(part) || part.data.consumed) return part;
      const stubbed: AgentPastePart = {
        ...part,
        data: { ...part.data, text: label, chars: label.length, consumed: true },
      };
      return stubbed;
    }),
  })) as UIMessage[];
}

// Derived from the messages array rather than live useChat state, so it works
// identically on a transcript rehydrated from the DB.
export function hasPendingApproval(messages: UIMessage[]): boolean {
  return messages.some((message) =>
    (message.parts ?? []).some(
      (part) => isToolUIPart(part) && part.state === "approval-requested",
    ),
  );
}

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
