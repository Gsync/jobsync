import type { UIMessageStreamWriter } from "ai";
import type { AgentToolName, AgentToolStepId } from "@/lib/agent/registry";
import {
  AGENT_TOOL_PROGRESS_PART_TYPE,
  type AgentResumeSource,
  type AgentToolProgressData,
} from "@/models/agent.model";

// relabel replaces an earlier step's registry label, sent with this write so
// the resolved detail lands as that step is checked off.
export function toolStepReporter<Name extends AgentToolName>(
  _name: Name,
  writer: UIMessageStreamWriter,
  toolCallId: string,
): (step: AgentToolStepId<Name>, relabel?: Partial<Record<AgentToolStepId<Name>, string>>) => void {
  const reached: string[] = [];
  const labels: Record<string, string> = {};
  return (step, relabel) => {
    reached.push(step);
    Object.assign(labels, relabel);
    const data: AgentToolProgressData = { steps: [...reached] };
    if (Object.keys(labels).length > 0) data.labels = { ...labels };
    writer.write({ type: AGENT_TOOL_PROGRESS_PART_TYPE, id: toolCallId, data });
  };
}

// pageNote says what a "page" source meant to the caller: the resume being
// viewed, or the one linked to the open job.
export function resumeStepLabel(
  lookup: { resume: { title: string }; source: AgentResumeSource },
  pageNote: string,
): string {
  const note =
    lookup.source === "default" ? " (default)"
    : lookup.source === "page" ? ` (${pageNote})`
    : "";
  return `Using resume "${lookup.resume.title}"${note}`;
}
