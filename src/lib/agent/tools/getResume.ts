import { tool } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentGetResumeSchema } from "@/models/agent.schema";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import type { AgentGetResumeResult } from "@/models/agent.model";

/**
 * userId comes from the route's authenticated session and pageResumeId from
 * pageContext. Both are closure parameters — anything with those names in
 * the model's input is ignored. Same IDOR boundary as buildAddJobTool, and
 * it has a dedicated test.
 */
export function buildGetResumeTool(userId: string, pageResumeId?: string) {
  return tool({
    description: AGENT_TOOL_DESCRIPTIONS.get_resume,
    inputSchema: AgentGetResumeSchema,
    // No needsApproval: this reads the caller's own data and shows it only
    // to them. The gate exists to stop writes the user has not seen.
    execute: async (raw): Promise<AgentGetResumeResult> => {
      try {
        const lookup = await resolveResumeForAgent(userId, {
          title: raw?.resumeTitle,
          pageResumeId,
        });

        if (lookup.status === "no_resumes") return { status: "no_resumes" };
        if (lookup.status === "needs_selection") {
          return { status: "needs_selection", resumes: lookup.resumes };
        }

        const title = lookup.resume.title;
        const pre = await preprocessResume(lookup.resume);
        if (!pre.success) {
          return {
            status: "unreadable",
            title,
            reason: "It may be too short or missing content. Check it in Profile → Resumes.",
          };
        }

        const full = pre.data.normalizedText;
        const resumeText = full.slice(0, APP_CONSTANTS.AGENT_CHAT_RESUME_MAX_CHARS);
        return {
          status: "ok",
          resumeId: lookup.resume.id!,
          title,
          resumeText,
          chars: resumeText.length,
          truncated: resumeText.length < full.length,
          source: lookup.source,
          ambiguousTitle: lookup.ambiguousTitle || undefined,
        };
      } catch (error) {
        console.error("[agent-chat] get_resume failed:", error);
        // Returned, not thrown, so the model can tell the user rather than
        // the whole turn failing.
        return {
          status: "unreadable",
          title: raw?.resumeTitle ?? "that resume",
          reason: "Reading it failed. Try again, or open it from the Profile page.",
        };
      }
    },
  });
}
