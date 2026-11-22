import { tool, type UIMessageStreamWriter } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentAddQuestionSchema } from "@/models/agent.schema";
import { saveQuestions } from "@/lib/questions/saveQuestions";
import { log } from "@/lib/telemetry";
import { toolStepReporter } from "@/lib/agent/steps/progress";
import type { AgentAddQuestionResult } from "@/models/agent.model";
import type { SaveQuestionResult } from "@/models/question.model";

const UNSETTLED: ReadonlySet<SaveQuestionResult["status"]> = new Set([
  "exists",
  "similar",
  "invalid",
  "failed",
]);

type AgentStep = {
  toolCalls?: readonly { toolName: string; invalid?: boolean; input?: unknown }[];
  toolResults?: readonly { toolName: string; output?: unknown }[];
};

const hasAddQuestionCall = (step: AgentStep) =>
  Boolean(step.toolCalls?.some((c) => c.toolName === "add_question"));

// No approval, so a missing result means the call errored, never pending
function addQuestionStepResolved(step: AgentStep): boolean {
  const call = step.toolCalls?.find((c) => c.toolName === "add_question");
  if (!call || call.invalid) return false;
  const result = step.toolResults?.find((r) => r.toolName === "add_question");
  const output = result?.output as AgentAddQuestionResult | undefined;
  if (!output || output.error) return false;
  return !output.items.some((item) => UNSETTLED.has(item.status));
}

/**
 * Held or failed items keep the turn open for the model to ask about them,
 * and a full last call keeps it open so the rest of a longer list can follow.
 * An earlier unresolved step keeps it open too: its re-call settling must not
 * end the turn before the rest of the list is sent.
 */
export function addQuestionSettled(steps: readonly AgentStep[]): boolean {
  const last = steps.at(-1);
  if (!last || !addQuestionStepResolved(last)) return false;
  const earlier = steps.slice(0, -1).filter(hasAddQuestionCall);
  if (!earlier.every(addQuestionStepResolved)) return false;
  const call = last.toolCalls?.find((c) => c.toolName === "add_question");
  const sent = (call?.input as { questions?: unknown[] } | undefined)?.questions;
  return sent?.length !== APP_CONSTANTS.MAX_QUESTIONS_PER_CALL;
}

// userId is captured from the session; a userId in the model's input is ignored
export function buildAddQuestionTool({
  userId,
  writer,
}: {
  userId: string;
  pastedText?: string;
  writer: UIMessageStreamWriter;
}) {
  return tool({
    description: AGENT_TOOL_DESCRIPTIONS.add_question,
    inputSchema: AgentAddQuestionSchema,
    execute: async (input, { toolCallId }): Promise<AgentAddQuestionResult> => {
      const report = toolStepReporter("add_question", writer, toolCallId);
      try {
        const items = await saveQuestions(input.questions, userId, {
          createdVia: APP_CONSTANTS.AGENT_CHAT_CREATED_VIA,
          replaceAgentCreatedOnly: false,
          onStep: report,
        });
        report.finish();
        return { items };
      } catch (error) {
        log.error("[agent-chat] add_question failed", { error: String(error) });
        // Fixed text: Prisma messages carry connection details
        return {
          items: [],
          error: "Saving the questions failed. Try again, or add them from the Questions page.",
        };
      }
    },
  });
}
