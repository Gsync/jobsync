import { hasToolCall, type StopCondition } from "ai";
import type { InferToolInput, LanguageModel, ToolApprovalStatus, ToolSet, UIMessageStreamWriter } from "ai";
import { AGENT_CHAT_TERMINAL_TOOLS, AGENT_TOOL_NAMES, type AgentToolName } from "@/lib/agent/registry";
import { addJobSettled, type PageContext } from "@/models/agent.model";
import type { NestedGenerationGuard } from "@/lib/agent/steps/nestedGeneration";
import { addJobNeedsApproval, buildAddJobTool } from "./addJob";
import { buildGetResumeTool } from "./getResume";
import { buildReviewResumeTool } from "./reviewResume";
import { buildMatchJobTool } from "./matchJob";
import { buildGenerateCoverLetterTool } from "./generateCoverLetter";

export type AgentToolContext = {
  userId: string;
  pastedText?: string;
  pageContext?: PageContext;
  model: LanguageModel;
  provider: string;
  modelName: string;
  writer: UIMessageStreamWriter;
  nestedGuard: NestedGenerationGuard;
};

type AgentToolServerEntry = {
  build: (ctx: AgentToolContext) => ToolSet[string];
  settled?: typeof addJobSettled;
  approval?: (input: InferToolInput<ToolSet[string]>, pastedText?: string) => boolean;
};

const AGENT_TOOL_SERVER: Record<AgentToolName, AgentToolServerEntry> = {
  add_job: {
    build: (ctx) => buildAddJobTool(ctx.userId, ctx.pastedText),
    settled: addJobSettled,
    approval: addJobNeedsApproval,
  },
  get_resume: {
    build: (ctx) => buildGetResumeTool(ctx.userId, ctx.pageContext?.resumeId),
  },
  review_resume: {
    build: (ctx) => buildReviewResumeTool({
      ...ctx,
      pageResumeId: ctx.pageContext?.resumeId,
      guard: ctx.nestedGuard,
    }),
  },
  match_job: {
    build: (ctx) => buildMatchJobTool({
      ...ctx,
      pageJobId: ctx.pageContext?.jobId,
      guard: ctx.nestedGuard,
    }),
  },
  generate_cover_letter: {
    build: (ctx) => buildGenerateCoverLetterTool({
      ...ctx,
      pageJobId: ctx.pageContext?.jobId,
      guard: ctx.nestedGuard,
    }),
  },
};

export function buildAgentTools(ctx: AgentToolContext): ToolSet {
  return Object.fromEntries(
    AGENT_TOOL_NAMES.map((name) => [name, AGENT_TOOL_SERVER[name].build(ctx)]),
  );
}

export function buildAgentStopWhen(): StopCondition<ToolSet>[] {
  return AGENT_CHAT_TERMINAL_TOOLS.map((name) => {
    const { settled } = AGENT_TOOL_SERVER[name];
    if (!settled) return hasToolCall(name);
    return ({ steps }) => settled(steps[steps.length - 1] ?? {});
  });
}

export function buildAgentToolApproval(pastedText?: string) {
  const gates: Record<string, (input: InferToolInput<ToolSet[string]>) => ToolApprovalStatus> = {};
  for (const name of AGENT_TOOL_NAMES) {
    const { approval } = AGENT_TOOL_SERVER[name];
    if (approval) {
      gates[name] = (input) => approval(input, pastedText) ? "user-approval" : "not-applicable";
    }
  }
  return gates;
}

export {
  buildAddJobTool,
  buildGetResumeTool,
  buildReviewResumeTool,
  buildMatchJobTool,
  buildGenerateCoverLetterTool,
};
