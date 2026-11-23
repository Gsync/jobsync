import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  isAgentPastePart,
  type AgentAddJobResult,
  type AgentAddQuestionResult,
  type AgentPastePart,
} from "@/models/agent.model";
import type { SaveQuestionResult } from "@/models/question.model";

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

function countLabel(count: number, text: string): string[] {
  return count > 0 ? [`${count} ${text}`] : [];
}

export function pastedQuestionsLabel(output: AgentAddQuestionResult): string {
  const count = (...statuses: SaveQuestionResult["status"][]) =>
    output.items.filter((item) => statuses.includes(item.status)).length;
  const counts = output.error ? [] : [
    ...countLabel(count("saved", "merged"), "saved"),
    ...countLabel(count("skipped", "exists"), "already in your bank"),
    ...countLabel(count("similar", "invalid"), "waiting on your reply"),
    ...countLabel(count("failed"), "not saved"),
  ];
  return `[pasted questions — ${counts.length > 0 ? counts.join(", ") : "not saved"}]`;
}

function consumingLabel(part: UIMessage["parts"][number]): string | undefined {
  if (!isToolUIPart(part) || part.state !== "output-available") return undefined;
  const name = getToolName(part);
  // add_question reads the paste whatever the outcome: held and skipped items
  // are re-sent from the result, never re-read from the paste.
  if (name === "add_question") {
    return pastedQuestionsLabel(part.output as AgentAddQuestionResult);
  }
  // Only these two tools consume a paste. Without this guard any future tool
  // returning created:true stubs the posting out from under it.
  if (name !== "add_job") return undefined;
  // Only a successful create consumes the posting. A duplicate or a
  // validation failure leaves it available for the retry.
  if (!(part.output as AgentAddJobResult | undefined)?.created) return undefined;
  const input = part.input as { company?: string; jobTitle?: string } | undefined;
  return `[pasted posting — saved as ${input?.jobTitle ?? "a job"} at ${input?.company ?? "a company"}]`;
}

export function findConsumingWrite(
  messages: UIMessage[],
): { label: string; messageIndex: number } | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const parts = messages[i]?.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j--) {
      const label = consumingLabel(parts[j]!);
      if (label) return { label, messageIndex: i };
    }
  }
  return undefined;
}

export function consumesPaste(messages: UIMessage[]): boolean {
  return findConsumingWrite(messages) !== undefined;
}

// Called from the persistence path so stubbing happens in exactly one place.
// Without it a conversation that added five jobs carries ~30KB of dead
// posting text forever, re-sent on every request.
export function stubConsumedPastes(messages: UIMessage[]): UIMessage[] {
  const write = findConsumingWrite(messages);
  if (!write) return messages;

  // Pastes after the write are still live: a second list pasted while the
  // agent asks about answers must survive the turn's DB save.
  return messages.map((message, index) => index > write.messageIndex ? message : {
    ...message,
    parts: (message.parts ?? []).map((part) => {
      if (!isAgentPastePart(part) || part.data.consumed) return part;
      const stubbed: AgentPastePart = {
        ...part,
        // chars is left alone: the chip still labels the user's paste, so
        // rewriting it to the stub's length shrinks the count on screen as
        // if we had truncated what they pasted.
        data: { ...part.data, text: write.label, consumed: true },
      };
      return stubbed;
    }),
  }) as UIMessage[];
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
