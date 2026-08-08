import type { LanguageModel, ToolSet, UIMessageStreamWriter } from "ai";
import type { PageContext } from "@/models/agent.model";
import { buildAddJobTool } from "./addJob";
import { buildGetResumeTool } from "./getResume";
import { buildReviewResumeTool } from "./reviewResume";
import { buildMatchJobTool } from "./matchJob";

// review_resume and match_job deliberately break the "a tool touches neither
// the route nor provider resolution" rule in CLAUDE.md: they run their own
// generation, so they need the resolved model and the stream writer. Recorded
// in docs/architecture/agent-chat.md rather than contorted around.
export function buildAgentTools(ctx: {
  userId: string;
  pastedText?: string;
  pageContext?: PageContext;
  model: LanguageModel;
  provider: string;
  modelName: string;
  writer: UIMessageStreamWriter;
}): ToolSet {
  return {
    add_job: buildAddJobTool(ctx.userId, ctx.pastedText),
    get_resume: buildGetResumeTool(ctx.userId, ctx.pageContext?.resumeId),
    review_resume: buildReviewResumeTool({
      userId: ctx.userId,
      pageResumeId: ctx.pageContext?.resumeId,
      model: ctx.model,
      provider: ctx.provider,
      modelName: ctx.modelName,
      writer: ctx.writer,
    }),
    match_job: buildMatchJobTool({
      userId: ctx.userId,
      pageJobId: ctx.pageContext?.jobId,
      model: ctx.model,
      provider: ctx.provider,
      modelName: ctx.modelName,
      writer: ctx.writer,
    }),
  };
}

export {
  buildAddJobTool,
  buildGetResumeTool,
  buildReviewResumeTool,
  buildMatchJobTool,
};
