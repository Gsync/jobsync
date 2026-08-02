import { tool } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentAddJobParseSchema, AgentAddJobSchema } from "@/models/agent.schema";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import type { AgentAddJobResult } from "@/models/agent.model";

const NO_DESCRIPTION = "No job description was supplied. Ask the user to paste the job posting, or to type the role's details, then try again.";

function failed(validationError: string): AgentAddJobResult {
  return { created: false, resolutions: [], validationError };
}

/**
 * userId and pastedText are captured from the route's authenticated session
 * and message array. Anything with those names inside the model's input is
 * ignored — this is the IDOR boundary and it has a dedicated test.
 */
export function buildAddJobTool(userId: string, pastedText?: string) {
  return tool({
    description: AGENT_TOOL_DESCRIPTIONS.add_job,
    // Date transforms are deferred here so this schema doubles as the JSON
    // schema the model reads — see src/models/agent.schema.ts.
    inputSchema: AgentAddJobSchema,
    needsApproval: true,
    execute: async (raw): Promise<AgentAddJobResult> => {
      const parsed = AgentAddJobParseSchema.safeParse(raw);
      if (!parsed.success) {
        // Returned, not thrown, so the model can see why and retry.
        return failed(
          parsed.error.issues
            .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
            .join("; "),
        );
      }

      const input = parsed.data;
      const jobDescription = pastedText ?? input.jobDescription;
      if (!jobDescription) return failed(NO_DESCRIPTION);

      try {
        const result = await createJobFromNames(
          {
            ...input,
            jobDescription,
            createdVia: APP_CONSTANTS.AGENT_CHAT_CREATED_VIA,
          },
          userId,
        );

        // result.message is deliberately NOT returned: it is MCP-facing
        // protocol text naming update_job and allowDuplicate, neither of
        // which this surface exposes. The card composes its own copy.
        return {
          created: result.created,
          jobId: result.jobId,
          duplicateOf: result.duplicateOf,
          resolutions: result.resolutions,
          descriptionSource: pastedText ? "pasted" : "model",
          descriptionChars: jobDescription.length,
          descriptionCompleteness: result.descriptionCompleteness,
        };
      } catch (error) {
        console.error("[agent-chat] add_job failed:", error);
        return failed("Saving the job failed. Try again, or add it from the Jobs page.");
      }
    },
  });
}
