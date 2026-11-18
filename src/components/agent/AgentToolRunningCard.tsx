"use client";

import { getToolName, type ToolUIPart } from "ai";
import { AGENT_TOOL_META, isAgentToolName } from "@/lib/agent/registry";
import { AgentStatusRow } from "@/components/agent/AgentStatusRow";

// Confirmation renders null for these states, so this is not redundant with
// it. On a local 8B, deciding on a tool call is the longest phase of a turn.
export function AgentToolRunningCard({ part }: { part: ToolUIPart }) {
  const toolName = getToolName(part);
  const label = isAgentToolName(toolName) ? AGENT_TOOL_META[toolName].runningLabel : "Working…";

  return <AgentStatusRow label={label} />;
}
