import { isToolUIPart, type UIMessage } from "ai";

type Part = UIMessage["parts"][number];

// After Stop the browser still holds an approval the server already finished.
export function mergeCommittedResults(incoming: UIMessage[], stored: UIMessage[]): UIMessage[] {
  const finished = new Map<string, Part>();
  for (const part of stored.flatMap(message => message.parts ?? [])) {
    if (isToolUIPart(part) && part.state === "output-available") finished.set(part.toolCallId, part);
  }
  if (finished.size === 0) return incoming;
  // Unvalidated client input; a malformed message is left for the SDK's 400.
  return incoming.map(message => Array.isArray(message?.parts)
    ? { ...message, parts: message.parts.map(part => committedOr(part, finished)) }
    : message);
}

function committedOr(part: Part, finished: Map<string, Part>): Part {
  if (!isToolUIPart(part) || part.state !== "approval-responded") return part;
  const stored = finished.get(part.toolCallId);
  return stored?.type === part.type ? stored : part;
}
