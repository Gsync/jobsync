import type { ToolSet } from "ai";
import type { PageContext } from "@/models/agent.model";
import { buildAddJobTool } from "./addJob";
import { buildGetResumeTool } from "./getResume";

// A context object rather than positional args: read tools need pageContext,
// and this stops the signature churning when they land.
export function buildAgentTools(ctx: {
  userId: string;
  pastedText?: string;
  pageContext?: PageContext;
}): ToolSet {
  return {
    add_job: buildAddJobTool(ctx.userId, ctx.pastedText),
    get_resume: buildGetResumeTool(ctx.userId, ctx.pageContext?.resumeId),
  };
}

export { buildAddJobTool, buildGetResumeTool };
