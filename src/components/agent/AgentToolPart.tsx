"use client";

import { getToolName, type ToolUIPart } from "ai";
import { AgentApprovalCard } from "@/components/agent/AgentApprovalCard";
import { AgentResultCard } from "@/components/agent/AgentResultCard";
import { AgentToolProgress } from "@/components/agent/AgentToolProgress";
import { AgentToolRunningCard } from "@/components/agent/AgentToolRunningCard";
import {
  AGENT_TOOL_VIEWS,
  type AgentToolOutcome,
} from "@/components/agent/AgentToolViews";
import {
  AGENT_TOOL_META,
  isAgentToolName,
  type AgentToolName,
} from "@/lib/agent/registry";
import type { AgentReplyStop } from "@/models/agent.model";

type Props = {
  part: ToolUIPart;
  steps?: readonly string[];
  stepLabels?: Readonly<Record<string, string>>;
  resumeId?: string;
  durationSeconds?: Readonly<Record<string, number>>;
  streamed?: string;
  running: boolean;
  stopped?: AgentReplyStop;
  pastedText?: string;
  onRespond: React.ComponentProps<typeof AgentApprovalCard>["onRespond"];
};

// A saved id the registry no longer has means the part is from another
// version; it renders as if no step was reported (D20).
function knownSteps(
  tool: AgentToolName,
  steps: readonly string[] | undefined,
): readonly string[] | undefined {
  if (!steps?.length) return undefined;
  const ids = AGENT_TOOL_META[tool].steps.map((s) => s.id as string);
  return steps.every((id) => ids.includes(id)) ? steps : undefined;
}

function outcomeOf(part: ToolUIPart, tool: AgentToolName): AgentToolOutcome | undefined {
  if (part.state === "output-error") return "failed";
  if (part.state !== "output-available") return undefined;
  return AGENT_TOOL_VIEWS[tool].outcome?.(part.output) ?? "ok";
}

export function AgentToolPart(props: Props) {
  const { part, steps, streamed, onRespond, pastedText } = props;
  const toolName = getToolName(part);
  const reached = isAgentToolName(toolName) ? knownSteps(toolName, steps) : undefined;
  const Stream = isAgentToolName(toolName) ? AGENT_TOOL_VIEWS[toolName].Stream : undefined;
  const stream = Stream && streamed ? <Stream text={streamed} /> : null;
  // Older progress records have the selected resume ID only in the result.
  const output = part.state === "output-available" ? part.output : undefined;
  const savedResumeId = output && typeof output === "object" &&
    "resumeId" in output && typeof output.resumeId === "string" ? output.resumeId : undefined;

  const progress = (section: "before" | "after") =>
    reached && isAgentToolName(toolName) ? (
      <AgentToolProgress
        toolName={toolName}
        steps={reached}
        stepLabels={props.stepLabels}
        resumeId={props.resumeId ?? savedResumeId}
        durationSeconds={props.durationSeconds}
        section={section}
        outcome={outcomeOf(part, toolName)}
        running={props.running}
        stopped={props.stopped}
        streaming={Boolean(stream)}
      />
    ) : null;

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <>
          {progress("before")}
          {stream ?? (reached ? null : <AgentToolRunningCard part={part} />)}
          {progress("after")}
        </>
      );
    case "approval-requested":
    case "approval-responded":
      return (
        <>
          <AgentApprovalCard
            part={part}
            pastedText={pastedText}
            progressStarted={Boolean(reached)}
            onRespond={onRespond}
          />
          {progress("after")}
        </>
      );
    // Default, not a case list: AgentResultCard already returns null for
    // anything it does not recognize.
    default:
      return (
        <>
          {progress("before")}
          <AgentResultCard part={part} />
          {progress("after")}
        </>
      );
  }
}
