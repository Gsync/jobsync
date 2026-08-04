"use client";

import { CheckCircle, Loader2, Scan, Sparkles, X, XCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AgentChatEmptyState } from "@/components/agent/AgentChatEmptyState";
import { AgentChatInput } from "@/components/agent/AgentChatInput";
import { AgentChatMessages } from "@/components/agent/AgentChatMessages";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { AiProvider } from "@/models/ai.model";

export function AgentChatPanel() {
  const {
    isOpen,
    close,
    clear,
    messages,
    panelWidth: width,
    startResize,
    isPanelExpanded,
    togglePanelExpand,
    preflight,
  } = useAgentChat();

  // Status icon for the terminal header bar — mirrors AiResumeReviewSection.
  const statusIcon = !preflight.checked ? (
    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
  ) : preflight.provider === AiProvider.OLLAMA ? (
    preflight.ok ? (
      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />
    ) : (
      <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
    )
  ) : (
    <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  );

  const providerLabel = preflight.provider
    ? preflight.provider.charAt(0).toUpperCase() + preflight.provider.slice(1)
    : "";

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
            // 100vw, not the drag-resize ratio cap: expanding docks the panel
            // flush against the sidebar, which can exceed that ratio.
            "--agent-chat-max": "100vw",
          } as React.CSSProperties
        }
      >
        {/* VS Code-style drag handle; docking only applies at lg+ */}
        <div
          className="absolute left-0 top-0 h-full w-1 cursor-col-resize z-10 group hidden lg:block"
          onMouseDown={startResize}
        >
          <div className="h-full w-px bg-transparent group-hover:bg-primary/50 transition-colors" />
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/20 shrink-0">
          <SheetTitle className="text-[11px] font-bold tracking-[0.15em] uppercase text-foreground leading-none shrink-0 m-0">
            AI AGENT
          </SheetTitle>
          <span className="text-muted-foreground/30 text-xs select-none">
            ···
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            {statusIcon}
            <span className="text-xs text-muted-foreground font-mono truncate">
              {preflight.model
                ? `${providerLabel} / ${preflight.model}`
                : providerLabel}
            </span>
          </div>
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
            aria-label={isPanelExpanded ? "Restore panel" : "Expand panel"}
            className="h-6 w-6 shrink-0 rounded-sm opacity-70 hover:opacity-100 hidden lg:inline-flex"
            onClick={togglePanelExpand}
            size="icon"
            variant="ghost"
          >
            <Scan className="h-3.5 w-3.5" />
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
