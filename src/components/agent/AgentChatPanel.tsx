"use client";

import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AgentChatEmptyState } from "@/components/agent/AgentChatEmptyState";
import { AgentChatInput } from "@/components/agent/AgentChatInput";
import { AgentChatMessages } from "@/components/agent/AgentChatMessages";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { APP_CONSTANTS } from "@/lib/constants";

export function AgentChatPanel() {
  const { isOpen, close, clear, messages } = useAgentChat();
  // Not "ai-panel-width": that key is shared by the three AI sheets, and
  // dragging this panel would silently resize all of them.
  const { width, handleMouseDown } = useResizablePanel(
    APP_CONSTANTS.AGENT_CHAT_PANEL_WIDTH_KEY,
  );

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      modal={false}
    >
      <SheetContent
        overlay={false}
        // Docked, not a takeover: without these the first click on the jobs
        // list behind the panel would dismiss it, and refreshing that list
        // after a write would be pointless.
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="flex flex-col p-0 overflow-hidden [&>button:last-child]:hidden w-full max-w-full sm:max-w-full lg:w-(--agent-chat-w) lg:max-w-(--agent-chat-max)"
        style={
          {
            "--agent-chat-w": `${width}px`,
            "--agent-chat-max": `${APP_CONSTANTS.RESIZABLE_PANEL_MAX_WIDTH_RATIO * 100}vw`,
          } as React.CSSProperties
        }
      >
        {/* VS Code-style drag handle; docking only applies at lg+ */}
        <div
          className="absolute left-0 top-0 h-full w-1 cursor-col-resize z-10 group hidden lg:block"
          onMouseDown={handleMouseDown}
        >
          <div className="h-full w-px bg-transparent group-hover:bg-primary/50 transition-colors" />
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/20 shrink-0">
          <SheetTitle className="text-[11px] font-bold tracking-[0.15em] uppercase text-foreground leading-none shrink-0 m-0">
            JOBSYNC AGENT
          </SheetTitle>
          <span className="text-muted-foreground/30 text-xs select-none">
            ···
          </span>
          {/* Never gated on the approval: it is the way out of a card whose
              approvalId the server no longer recognizes. */}
          <Button
            className="h-6 ml-auto shrink-0 rounded-sm px-2 text-xs opacity-70 hover:opacity-100"
            onClick={() => void clear()}
            size="sm"
            variant="ghost"
          >
            Clear
          </Button>
          <Button
            aria-label="Close chat"
            className="h-6 w-6 shrink-0 rounded-sm opacity-70 hover:opacity-100"
            onClick={close}
            size="icon"
            variant="ghost"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {messages.length > 0 ? <AgentChatMessages /> : <AgentChatEmptyState />}

        <div className="shrink-0 border-t p-3">
          <AgentChatInput />
        </div>
      </SheetContent>
    </Sheet>
  );
}
