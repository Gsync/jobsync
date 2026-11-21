import type { UIMessageStreamWriter } from "ai";
import type { AgentToolName, AgentToolStepId } from "@/lib/agent/registry";
import { AGENT_TOOL_PROGRESS_PART_TYPE } from "@/models/agent.model";

export function toolStepReporter<Name extends AgentToolName>(
  _name: Name,
  writer: UIMessageStreamWriter,
  toolCallId: string,
): (step: AgentToolStepId<Name>) => void {
  const reached: string[] = [];
  return (step) => {
    reached.push(step);
    writer.write({
      type: AGENT_TOOL_PROGRESS_PART_TYPE,
      id: toolCallId,
      data: { steps: [...reached] },
    });
  };
}
