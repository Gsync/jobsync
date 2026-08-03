"use client";

import { getToolName, type ToolUIPart } from "ai";
import { AgentStatusRow } from "@/components/agent/AgentStatusRow";

// Confirmation renders null for these states, so this is not redundant with
// it. On a local 8B, deciding on a tool call is the longest phase of a turn.
export function AgentToolRunningCard({ part }: { part: ToolUIPart }) {
  const toolName = getToolName(part);
  const label =
    toolName === "add_job"
      ? "Preparing to add a job…"
      : toolName === "get_resume"
        ? "Reading your resume…"
        : "Working…";

  return <AgentStatusRow label={label} />;
}
