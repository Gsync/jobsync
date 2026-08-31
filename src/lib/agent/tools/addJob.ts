import { tool } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentAddJobParseSchema, AgentAddJobSchema } from "@/models/agent.schema";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { JobResolutionError } from "@/lib/jobs/resolve";
import { log } from "@/lib/telemetry";
import type { AgentAddJobResult } from "@/models/agent.model";

// The model usually reaches here having omitted jobDescription because the
// user's message looked pasted to it while no chip was made, so the recovery
// it needs is "copy it from the message", not "ask again" — asking again is
// what made it retry with a paraphrase and save a partial description.
const NO_DESCRIPTION = "No job description was supplied, and no pasted posting reached this turn. If the user's own message contains the posting or any description of the role, copy it into jobDescription verbatim and in full — never summarise, shorten or condense it — and call add_job again. Only if their message has no description at all, ask them to paste the posting or type the role's details, then try again.";

// What the card shows instead. The text above is addressed to the model, and
// the card would otherwise print all of it — field name, retry instruction
// and all — into the user's own transcript.
const NO_DESCRIPTION_DISPLAY = "no description came through with it. Paste the posting or say what the role involves, and it will be added.";

function failed(validationError: string, displayError?: string): AgentAddJobResult {
  return { created: false, resolutions: [], validationError, displayError };
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
    // Approval is asked for every call that could write, and skipped only for
    // one that execute is already certain to reject. The card renders before
    // execute runs, so a doomed call otherwise spends a Confirm and the retry
    // spends a second one — the user confirms the same job twice. This stays
    // in lockstep with the jobDescription check below: widening it to any
    // other condition would let a write reach the database unapproved.
    needsApproval: (input: { jobDescription?: string }) =>
      Boolean(pastedText ?? input?.jobDescription),
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
      if (!jobDescription) return failed(NO_DESCRIPTION, NO_DESCRIPTION_DISPLAY);

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
        log.error("[agent-chat] add_job failed", { error: String(error) });
        // Our own text, naming the field and the values it accepts, so the
        // model can fix the argument instead of guessing — its guess was to
        // drop the field, losing a value the posting stated. Every other
        // error keeps the fixed string: provider and Prisma messages carry
        // request context that must not reach the model.
        if (error instanceof JobResolutionError) return failed(error.message);
        return failed("Saving the job failed. Try again, or add it from the Jobs page.");
      }
    },
  });
}
