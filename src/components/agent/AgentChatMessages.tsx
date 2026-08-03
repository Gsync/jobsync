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
import { AgentApprovalCard } from "@/components/agent/AgentApprovalCard";
import { AgentMarkdown } from "@/components/agent/AgentMarkdown";
import { AgentResultCard } from "@/components/agent/AgentResultCard";
import { AgentStatusRow } from "@/components/agent/AgentStatusRow";
import { AgentToolRunningCard } from "@/components/agent/AgentToolRunningCard";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { resolvePastedText } from "@/lib/agent/paste";
import { cn } from "@/lib/utils";
import { isAgentPastePart, type AgentPastePartData } from "@/models/agent.model";

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

  const tail = last.parts[last.parts.length - 1];
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

export function AgentChatMessages() {
  const {
    messages,
    status,
    regenerate,
    addToolApprovalResponse,
    interruptedTurn,
    dismissInterrupted,
  } = useAgentChat();
  const [dismissed, setDismissed] = useState(false);

  const pastedText = resolvePastedText(messages);
  const showContinue =
    !dismissed && (interruptedTurn || endsAwaitingReply(messages, status));
  const thinking = showThinking(messages, status);

  const dismiss = () => {
    setDismissed(true);
    dismissInterrupted();
  };

  return (
    <Conversation className="flex-1">
      <ConversationContent className="gap-4">
        {messages.map((message) => (
          <div
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
              switch (part.state) {
                case "input-streaming":
                case "input-available":
                  return <AgentToolRunningCard key={i} part={part} />;
                case "approval-requested":
                case "approval-responded":
                  return (
                    <AgentApprovalCard
                      key={i}
                      part={part}
                      pastedText={pastedText}
                      onRespond={addToolApprovalResponse}
                    />
                  );
                // Default, not a case list: AgentResultCard already returns
                // null for anything it does not recognize, and rendering
                // nothing beats rendering an unknown future state raw.
                default:
                  return <AgentResultCard key={i} part={part} />;
              }
            })}
          </div>
        ))}

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

        {thinking && <AgentStatusRow label="Thinking…" />}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
