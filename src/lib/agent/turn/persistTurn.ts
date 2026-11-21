import "server-only";

import { generateId, isToolUIPart, type UIMessage } from "ai";
import { saveChatConversation, updateChatConversation } from "@/actions/agentChat.actions";
import { stubConsumedPastes } from "../memory/paste";
import type { CommittedOutput } from "./runToolDirect";

// Rebuilt from the request, since a cancelled stream stops recording early.
export function withCommittedOutput(messages: UIMessage[], committed: CommittedOutput): UIMessage[] {
  const { toolName, toolCallId, input, output } = committed;
  const last = messages.at(-1);
  if (last?.role === "assistant") {
    const parts = last.parts.map(part => isToolUIPart(part) && part.toolCallId === toolCallId
      ? { ...part, state: "output-available", output }
      : part);
    return [...messages.slice(0, -1), { ...last, parts } as UIMessage];
  }
  const part = { type: `tool-${toolName}`, toolCallId, state: "output-available", input, output };
  return [...messages, { id: generateId(), role: "assistant", parts: [{ type: "step-start" }, part] } as UIMessage];
}

export async function persistTurn({ messages, finalMessages, aborted, committed }: {
  messages: UIMessage[];
  finalMessages: UIMessage[];
  aborted: boolean;
  committed?: CommittedOutput;
}): Promise<void> {
  // Update-only, so a result landing after Clear leaves the chat deleted.
  if (committed) {
    await updateChatConversation(stubConsumedPastes(withCommittedOutput(messages, committed)));
    return;
  }
  // Saving after Clear would restore the deleted conversation.
  if (aborted) return;
  // Stubbing happens here so it lives in exactly one place.
  await saveChatConversation(stubConsumedPastes(finalMessages));
}
