"use client";

import { useState } from "react";
import { FileTextIcon, XIcon } from "lucide-react";
import { isStaticToolUIPart, type UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import { AgentMarkdown } from "@/components/agent/AgentMarkdown";
import { AgentStatusRow } from "@/components/agent/AgentStatusRow";
import { AgentToolPart } from "@/components/agent/AgentToolPart";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { resolvePastedText } from "@/lib/agent/memory/paste";
import { cn } from "@/lib/utils";
import {
  AGENT_DIRECT_INVOKE_PART_TYPE,
  AGENT_TOOL_PROGRESS_PART_TYPE,
  isAgentPastePart,
  type AgentPastePartData,
  type AgentToolProgressData,
} from "@/models/agent.model";
import { AGENT_TOOL_META, isAgentToolName } from "@/lib/agent/registry";

function PasteChip({ data }: { data: AgentPastePartData }) {
  const chars = data.chars.toLocaleString();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
      <FileTextIcon className="size-3" />
      Pasted posting · {chars} chars{data.truncated ? " (truncated)" : ""}
    </span>
  );
}

// The seeded transcript ending on a user message means the reply never came
// back — the tab was closed mid-turn, or the server died. Same remedy as an
// explicitly interrupted turn. Gated on status because a turn still waiting on
// its first chunk looks identical, and on a local model that wait is 30–60s.
function endsAwaitingReply(messages: UIMessage[], status: string): boolean {
  if (status === "submitted" || status === "streaming") return false;
  return messages[messages.length - 1]?.role === "user";
}

// Two silent windows on a local model: the wait before the first assistant
// part lands, and the wait after a tool result while the closing prose is
// composed. Both look identical — nothing on screen moves and the only signal
// is the submit button. Suppressed wherever the transcript already narrates
// itself, so there is never a second spinner beside a card that has one.
function showThinking(messages: UIMessage[], status: string): boolean {
  if (status !== "submitted" && status !== "streaming") return false;
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return true;

  // Progress parts land after the tool part and stay the tail; they are not
  // something on screen of their own.
  const tail = last.parts.findLast((part) => !part.type.startsWith("data-"));
  if (!tail) return true;
  if (tail.type === "text") return tail.text.trim().length === 0;
  if (!isStaticToolUIPart(tail)) return true;
  switch (tail.state) {
    // The running card spins for these two.
    case "input-streaming":
    case "input-available":
    // Waiting on the user, not the model.
    case "approval-requested":
    // The approval card already says "Waiting…".
    case "approval-responded":
      return false;
    default:
      return true;
  }
}

// A direct invoke runs no model, so the tool is known before any part exists.
function pendingDirectLabel(messages: UIMessage[], status: string): string | undefined {
  if (status !== "submitted" && status !== "streaming") return;
  const last = messages.at(-1);
  if (last?.role !== "user") return;
  const part = last.parts.find((p) => p.type === AGENT_DIRECT_INVOKE_PART_TYPE);
  const toolName = (part as { data?: { toolName?: string } } | undefined)?.data?.toolName;
  return toolName && isAgentToolName(toolName)
    ? AGENT_TOOL_META[toolName].runningLabel
    : undefined;
}

function progressSteps(message: UIMessage): Map<string, readonly string[]> {
  const steps = new Map<string, readonly string[]>();
  for (const part of message.parts) {
    if (part.type !== AGENT_TOOL_PROGRESS_PART_TYPE) continue;
    const { id, data } = part as { id?: string; data: AgentToolProgressData };
    if (id) steps.set(id, data.steps);
  }
  return steps;
}

export function AgentChatMessages() {
  const {
    messages,
    toolStreams,
    status,
    regenerate,
    addToolApprovalResponse,
    interruptedTurn,
    stoppedReplies,
    dismissInterrupted,
  } = useAgentChat();
  const [dismissed, setDismissed] = useState(false);

  const pastedText = resolvePastedText(messages);
  const showContinue =
    !dismissed && (interruptedTurn || endsAwaitingReply(messages, status));
  const inFlight = status === "streaming" || status === "submitted";
  const last = messages.at(-1);
  const directLabel = pendingDirectLabel(messages, status);
  const thinking = showThinking(messages, status);

  const dismiss = () => {
    setDismissed(true);
    dismissInterrupted();
  };

  return (
    <Conversation className="flex-1">
      <ConversationContent className="gap-4">
        {messages.map((message) => {
          const stopped = stoppedReplies.get(message.id);
          const steps = progressSteps(message);
          return <div
            key={message.id}
            className={cn(
              "flex flex-col gap-2 text-sm",
              message.role === "user" && "items-end",
            )}
          >
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                // User text stays plain: it is their own words, and a user
                // who types a markdown table did not ask for it to render.
                if (message.role === "user") {
                  return (
                    <p
                      key={i}
                      className="whitespace-pre-wrap break-words rounded-md bg-muted px-3 py-2"
                    >
                      {part.text}
                    </p>
                  );
                }
                return <AgentMarkdown key={i} text={part.text} />;
              }
              if (isAgentPastePart(part))
                return <PasteChip key={i} data={part.data} />;
              // Static, not dynamic: every tool this surface exposes is
              // declared in buildAgentTools, so a dynamic part is not ours.
              if (!isStaticToolUIPart(part)) return null;
              return (
                <AgentToolPart
                  key={part.toolCallId}
                  part={part}
                  steps={steps.get(part.toolCallId)}
                  streamed={toolStreams[part.toolCallId]}
                  running={
                    message === last && inFlight && !stopped &&
                    !part.state.startsWith("output-")
                  }
                  stopped={stopped}
                  pastedText={pastedText}
                  onRespond={addToolApprovalResponse}
                />
              );
            })}
          </div>;
        })}

        {showContinue && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex-1">This reply was interrupted.</span>
            {/* Offered, never automatic — the user closed the panel, and
                silently restarting a 30–60s local generation on reopen undoes
                their own action. */}
            <Button
              onClick={() => void regenerate()}
              size="sm"
              type="button"
              variant="outline"
            >
              Continue
            </Button>
            <Button
              aria-label="Dismiss"
              className="size-6 shrink-0"
              onClick={dismiss}
              size="icon"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        )}

        {directLabel ? (
          <AgentStatusRow label={directLabel} />
        ) : thinking && <AgentStatusRow label="Thinking…" />}
      </ConversationContent>
      <ConversationScrollButton aria-label="Scroll to bottom" />
    </Conversation>
  );
}
