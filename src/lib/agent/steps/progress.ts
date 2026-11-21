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
) {
  type Step = AgentToolStepId<Name>;
  const reached: string[] = [];
  const labels: Record<string, string> = {};
  const durationSeconds: Record<string, number> = {};
  let startedAt = 0;

  function recordDuration(now: number) {
    const step = reached.at(-1);
    const seconds = Math.floor((now - startedAt) / 1000);
    if (!step || seconds < 1) return false;
    durationSeconds[step] = seconds;
    return true;
  }

  function writeProgress() {
    const data: AgentToolProgressData = { steps: [...reached] };
    if (Object.keys(labels).length > 0) data.labels = { ...labels };
    if (Object.keys(durationSeconds).length > 0) data.durationSeconds = { ...durationSeconds };
    writer.write({ type: AGENT_TOOL_PROGRESS_PART_TYPE, id: toolCallId, data });
  }

  function report(step: Step, relabel?: Partial<Record<Step, string>>) {
    const now = performance.now();
    recordDuration(now);
    startedAt = now;
    reached.push(step);
    Object.assign(labels, relabel);
    writeProgress();
  }

  report.finish = () => {
    if (recordDuration(performance.now())) writeProgress();
  };
  return report;
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
