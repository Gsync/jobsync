"use client";

import { getToolName, type ToolUIPart } from "ai";
import { isAgentToolName } from "@/lib/agent/registry";
import { AGENT_TOOL_VIEWS } from "@/components/agent/AgentToolViews";

export function AgentResultCard({ part }: { part: ToolUIPart }) {
  if (part.state === "output-denied") {
    return (
      <div className="rounded-sm border p-3 text-sm text-muted-foreground">
        Cancelled — nothing was saved.
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="rounded-sm border p-3 text-sm">
        That could not be completed. Try asking again.
      </div>
    );
  }

  if (part.state !== "output-available") return null;

  const toolName = getToolName(part);
  const Result = isAgentToolName(toolName) ? AGENT_TOOL_VIEWS[toolName].Result : undefined;
  const input = (part.input ?? {}) as Record<string, unknown>;

  return (
    <div className="rounded-sm border p-3">
      {Result && <Result output={part.output} input={input} />}
    </div>
  );
}
