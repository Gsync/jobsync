import "server-only";

import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai";
import { omitHistoricalResumeText, type PageContext } from "@/models/agent.model";
import {
  AGENT_PASTE_ONLY_USER_MESSAGE,
  buildPageContextMessage,
  buildPasteContextMessage,
  historicalPageHint,
} from "../prompt";
import { truncateForModel } from "./paste.server";
import { windowMessages } from "./window";

function hasPageLocation(metadata: unknown): metadata is { pageLocation: unknown } {
  return metadata !== null && typeof metadata === "object" && "pageLocation" in metadata;
}

function withHistoricalPages(messages: UIMessage[], pageContext?: PageContext): UIMessage[] {
  return messages.flatMap((message, index) => {
    const { metadata } = message;
    if (message.role !== "user" || !hasPageLocation(metadata)) {
      return [message];
    }
    const text = index === messages.length - 1
      ? buildPageContextMessage(pageContext)
      : historicalPageHint(metadata.pageLocation);
    return [message, {
      id: message.id, role: "user", parts: [{ type: "text", text }],
    }];
  });
}

function trimResumeHistory(messages: UIMessage[]): UIMessage[] {
  const latestUser = messages.findLastIndex(message => message.role === "user");
  const previousUser = messages.findLastIndex((message, index) => index < latestUser && message.role === "user");
  if (previousUser < 0) return messages;

  return messages.map((message, index) => index < previousUser && message.role === "assistant"
    ? { ...message, parts: message.parts.map(omitHistoricalResumeText) }
    : message);
}

export async function buildModelMessages({ messages, pageContext, pastedText }: {
  messages: UIMessage[];
  pageContext?: PageContext;
  pastedText?: string;
}): Promise<{ ok: true; modelMessages: ModelMessage[]; historyDropped: number } | { ok: false }> {
  // Async since ai@6 (correction #5), and the messages array is client-supplied
  // — a shape z.array(z.any()) let through can reject the conversion, and
  // that is a bad request, not a server crash.
  let windowed: UIMessage[];

  let modelMessages;
  try {
    windowed = windowMessages(trimResumeHistory(messages));
    modelMessages = await convertToModelMessages(withHistoricalPages(windowed, pageContext));
  } catch {
    return { ok: false };
  }

  // A chip-only send — paste, then Send without typing — has no text part,
  // and the paste part is not a model part, so the message converts to empty
  // content. Ollama rejects the whole request on it (its content field is a
  // string; the provider serializes empty content as []), and it keeps doing
  // so on every later turn while the shell stays in the window.
  //
  // It is given a body rather than dropped. Dropping it removed a user turn
  // that really happened, which moved the last-user-message boundary back
  // over an older assistant reply — and DeepSeek's thinking mode requires
  // reasoning_content on every assistant message after that boundary, so a
  // reasoning-free reply from two turns ago 400'd the whole request. No
  // provider is special-cased here: the transcript is simply true again.
  // (@ai-sdk/deepseek 3 now sends "" for missing V4 reasoning_content.)
  // The paste context message below is what actually carries the posting.
  modelMessages = modelMessages.flatMap((message) => {
    if (!(Array.isArray(message.content) && message.content.length === 0)) {
      return [message];
    }
    if (message.role !== "user") return [];
    return [{ role: "user" as const, content: AGENT_PASTE_ONLY_USER_MESSAGE }];
  });

  // Injected only on the turn that introduced the paste. On the approval POST
  // the last message is the assistant's, so nothing is re-injected — and the
  // full text never reaches the model on any turn.
  const last = windowed.at(-1);
  const lastIsUser = last?.role === "user";
  // Older clients still receive the live page hint on the current turn.
  if (lastIsUser && !hasPageLocation(last.metadata)) {
    modelMessages.push({ role: "user", content: buildPageContextMessage(pageContext) });
  }
  if (pastedText && lastIsUser) {
    const { block } = truncateForModel(pastedText);
    modelMessages.push({ role: "user", content: buildPasteContextMessage(block) });
  }

  return { ok: true, modelMessages, historyDropped: messages.length - windowed.length };
}
