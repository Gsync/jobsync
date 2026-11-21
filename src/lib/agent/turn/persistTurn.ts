import "server-only";

import { generateId, isToolUIPart, type UIMessage } from "ai";
import { saveChatConversation, updateChatConversation } from "@/actions/agentChat.actions";
import { AGENT_TOOL_PROGRESS_PART_TYPE } from "@/models/agent.model";
import { stubConsumedPastes } from "../memory/paste";
import type { CommittedOutput } from "./runToolDirect";

function isProgressFor(part: UIMessage["parts"][number], toolCallId: string): boolean {
  return part.type === AGENT_TOOL_PROGRESS_PART_TYPE && (part as { id?: string }).id === toolCallId;
}

// Rebuilt from the request, since a cancelled stream stops recording early.
export function withCommittedOutput(messages: UIMessage[], committed: CommittedOutput): UIMessage[] {
  const { toolName, toolCallId, input, output, progress } = committed;
  const progressParts = progress === undefined
    ? []
    : [{ type: AGENT_TOOL_PROGRESS_PART_TYPE, id: toolCallId, data: progress }];
  const last = messages.at(-1);
  if (last?.role === "assistant") {
    // The fresh progress replaces any earlier copy rather than duplicating it.
    const kept = progress === undefined ? last.parts : last.parts.filter(part => !isProgressFor(part, toolCallId));
    const parts = kept.flatMap<unknown>(part => isToolUIPart(part) && part.toolCallId === toolCallId
      ? [...progressParts, { ...part, state: "output-available", output }]
      : [part]);
    return [...messages.slice(0, -1), { ...last, parts } as UIMessage];
  }
  const part = { type: `tool-${toolName}`, toolCallId, state: "output-available", input, output };
  const parts = [{ type: "step-start" }, ...progressParts, part];
  return [...messages, { id: generateId(), role: "assistant", parts } as UIMessage];
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
