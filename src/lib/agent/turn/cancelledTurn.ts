import "server-only";

import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { saveChatConversation } from "@/actions/agentChat.actions";
import { stubConsumedPastes } from "../memory/paste";

function withDeniedOutput(messages: UIMessage[], toolCallId: string): UIMessage[] {
  const last = messages.at(-1);
  if (!last) return messages;
  const parts = last.parts.map(part =>
    "toolCallId" in part && part.toolCallId === toolCallId
      ? { ...part, state: "output-denied" as const }
      : part,
  ) as UIMessage["parts"];
  return [...messages.slice(0, -1), { ...last, parts }];
}

// No model runs: the denial is saved and the stream just closes the card.
export async function endCancelledTurn(messages: UIMessage[], toolCallId: string): Promise<Response> {
  await saveChatConversation(stubConsumedPastes(withDeniedOutput(messages, toolCallId)));
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: ({ writer }) => {
        writer.write({ type: "tool-output-denied", toolCallId });
        writer.write({ type: "finish", finishReason: "stop" });
      },
    }),
  });
}
