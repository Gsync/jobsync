"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentChat } from "@/components/agent/AgentChatProvider";

export function AgentChatTrigger() {
  const { isOpen, open, close, approvalPending } = useAgentChat();

  return (
    <Button
      variant="outline"
      className="relative"
      aria-label={isOpen ? "Close assistant" : "Open assistant"}
      onClick={() => (isOpen ? close() : open())}
    >
      <MessageSquare className="h-4 w-4" />
      AI Agent
      {/* Deliberately no streaming state: nothing generates while the panel
          is closed, so there is no background activity to advertise. */}
      {approvalPending && (
        <span
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary"
          aria-label="Approval pending"
        />
      )}
    </Button>
  );
}
