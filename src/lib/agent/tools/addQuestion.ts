import { tool, type UIMessageStreamWriter } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentAddQuestionSchema } from "@/models/agent.schema";
import { saveQuestions } from "@/lib/questions/saveQuestions";
import { normalizeQuestionText } from "@/lib/questions/similarity";
import { log } from "@/lib/telemetry";
import { toolStepReporter } from "@/lib/agent/steps/progress";
import { questionResultsForModel, type AgentAddQuestionResult, type AgentQuestionPasteCut } from "@/models/agent.model";
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

// Typed questions beside a live posting chip did not come from the paste
function drewOnPaste(pastedText: string, questions: { question: string }[]): boolean {
  const paste = normalizeQuestionText(pastedText);
  return questions.some(({ question }) => paste.includes(normalizeQuestionText(question)));
}

// lastQuestion is the last one the model sent, so the user knows where to resume
export function pasteCut(
  pastedText: string | undefined,
  questions: { question: string }[],
): AgentQuestionPasteCut | undefined {
  const readChars = APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS;
  if (!pastedText || pastedText.length <= readChars) return undefined;
  if (!drewOnPaste(pastedText, questions)) return undefined;
  return { readChars, totalChars: pastedText.length, lastQuestion: questions.at(-1)?.question ?? "" };
}

// userId is captured from the session; a userId in the model's input is ignored
export function buildAddQuestionTool({
  userId,
  pastedText,
  writer,
}: {
  userId: string;
  pastedText?: string;
  writer: UIMessageStreamWriter;
}) {
  // Built once per request: later calls in the turn would name a different
  // last question for the same paste
  let pasteReported = false;
  const takePaste = (questions: { question: string }[]) => {
    if (pasteReported) return {};
    const paste = pasteCut(pastedText, questions);
    if (!paste) return {};
    pasteReported = true;
    return { paste };
  };

  return tool({
    description: AGENT_TOOL_DESCRIPTIONS.add_question,
    inputSchema: AgentAddQuestionSchema,
    execute: async (input, { toolCallId }): Promise<AgentAddQuestionResult> => {
      const report = toolStepReporter("add_question", writer, toolCallId);
      const paste = takePaste(input.questions);
      try {
        const items = await saveQuestions(input.questions, userId, {
          createdVia: APP_CONSTANTS.AGENT_CHAT_CREATED_VIA,
          // No card confirms a replace, so app-written answers stay append-only
          replaceAgentCreatedOnly: true,
          onStep: report,
        });
        report.finish();
        return { ...questionResultsForModel(items), ...paste };
      } catch (error) {
        log.error("[agent-chat] add_question failed", { error: String(error) });
        // Fixed text: Prisma messages carry connection details
        return {
          items: [],
          error: "Saving the questions failed. Try again, or add them from the Questions page.",
          ...paste,
        };
      }
    },
  });
}
