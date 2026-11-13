import { tool } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { AgentAddJobParseSchema, AgentAddJobSchema } from "@/models/agent.schema";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { classifyDescriptionCompleteness } from "@/lib/jobs/descriptionCompleteness";
import { JobResolutionError } from "@/lib/jobs/resolve";
import { scrapeJobPosting, type ScrapedJobPosting } from "@/lib/scraper/jobPosting";
import { errorReason } from "@/lib/scraper/utils";
import { log } from "@/lib/telemetry";
import type { DescriptionCompleteness } from "@/models/job.model";
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

const COMPLETENESS_RANK: Record<DescriptionCompleteness, number> = {
  "title-only": 0,
  partial: 1,
  full: 2,
};

function chooseDescription(
  modelDescription: string | undefined,
  scraped: ScrapedJobPosting | undefined,
): { description: string | undefined; usedScraped: boolean } {
  if (!scraped?.description) {
    return { description: modelDescription, usedScraped: false };
  }
  if (!modelDescription) {
    return { description: scraped.description, usedScraped: true };
  }

  const modelRank = COMPLETENESS_RANK[classifyDescriptionCompleteness(modelDescription)];
  const scrapedRank = COMPLETENESS_RANK[classifyDescriptionCompleteness(scraped.description)];

  // The scrape is the page's own text, so it wins a tie only when it came
  // from structured job data. Without that signal a nav-heavy page can be
  // longer than a good description the model already had.
  const useScraped =
    scrapedRank > modelRank || (scraped.structuredData && scrapedRank === modelRank);

  return useScraped
    ? { description: scraped.description, usedScraped: true }
    : { description: modelDescription, usedScraped: false };
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
    // spends a second one — the user confirms the same job twice. A jobUrl is
    // enough to write because execute can read the posting itself. This stays
    // in lockstep with the description check below: widening it to any other
    // condition would let a write reach the database unapproved.
    needsApproval: (input: { jobDescription?: string; jobUrl?: string }) =>
      Boolean(pastedText ?? input?.jobDescription ?? input?.jobUrl),
    execute: async (raw, { abortSignal }): Promise<AgentAddJobResult> => {
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

      // A URL is enough to fill in what the model does not have. This also
      // repairs a description the model truncated while copying it out of
      // scrape_job, because the full text never has to survive the model's
      // context window. A paste always wins over the page.
      let scraped: ScrapedJobPosting | undefined;
      let scrapeFailure: string | undefined;
      if (!pastedText && input.jobUrl) {
        const result = await scrapeJobPosting(input.jobUrl, {
          signal: abortSignal,
        });
        if (result.success) {
          scraped = result.data;
        } else {
          scrapeFailure = errorReason(result.error);
        }
      }

      const chosen = chooseDescription(
        pastedText ?? input.jobDescription,
        scraped,
      );
      const jobDescription = chosen.description;
      if (!jobDescription) {
        const note = scrapeFailure
          ? `The page could not be read (${scrapeFailure}). `
          : "";
        return failed(
          `${note}${NO_DESCRIPTION}`,
          `${note}${NO_DESCRIPTION_DISPLAY}`,
        );
      }

      try {
        const result = await createJobFromNames(
          {
            ...input,
            company: input.company || scraped?.company || "",
            jobTitle: input.jobTitle || scraped?.title || "",
            location: input.location || scraped?.location || undefined,
            source: input.source || scraped?.source || undefined,
            jobType: input.jobType || scraped?.employmentType || undefined,
            workplaceType:
              input.workplaceType || scraped?.workplaceType || undefined,
            salaryRange: input.salaryRange || scraped?.salary || undefined,
            tags:
              input.tags && input.tags.length > 0
                ? input.tags
                : scraped?.skills,
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
          descriptionSource: pastedText
            ? "pasted"
            : chosen.usedScraped
              ? "scraped"
              : "model",
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
