"use client";

import { Loader2 } from "lucide-react";
import { getToolName, type ToolUIPart } from "ai";
import { useSlowResponseWarning } from "@/hooks/useSlowResponseWarning";
import { SlowResponseWarning } from "@/components/common/SlowResponseWarning";

// Confirmation renders null for these states, so this is not redundant with
// it. On a local 8B, deciding on a tool call is the longest phase of a turn.
export function AgentToolRunningCard({ part }: { part: ToolUIPart }) {
  const showSlowWarning = useSlowResponseWarning(true, false);
  const label =
    getToolName(part) === "add_job" ? "Preparing to add a job…" : "Working…";

  return (
    <div className="rounded-sm border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{label}</span>
      </div>
      {showSlowWarning && <SlowResponseWarning />}
    </div>
  );
}
