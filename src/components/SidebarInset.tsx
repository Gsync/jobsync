"use client";

import { useSidebar } from "@/context/SidebarContext";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { APP_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Offsets page content by the sidebar's current width, and by the agent chat
// panel's width while it is docked (lg+ only — below that the panel covers
// the viewport instead of docking).
function SidebarInset({ children }: { children: React.ReactNode }) {
  const { expanded } = useSidebar();
  const { isOpen, panelWidth, isResizing } = useAgentChat();
  return (
    <div
      className={cn(
        "flex flex-1 flex-col sm:gap-4 sm:py-4",
        // Following the drag handle 200ms late reads as lag, not animation.
        isResizing
          ? "transition-none"
          : "transition-[padding] duration-200 ease-in-out",
        expanded
          ? APP_CONSTANTS.SIDEBAR_WIDTH.expanded.contentOffset
          : APP_CONSTANTS.SIDEBAR_WIDTH.collapsed.contentOffset,
        isOpen && "lg:pr-(--agent-chat-offset)"
      )}
      // Only while open: panelWidth is seeded from localStorage, so emitting
      // it during SSR (always closed) is a hydration mismatch.
      style={
        isOpen
          ? ({
              "--agent-chat-offset": `min(${panelWidth}px, ${APP_CONSTANTS.RESIZABLE_PANEL_MAX_WIDTH_RATIO * 100}vw)`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}

export default SidebarInset;
