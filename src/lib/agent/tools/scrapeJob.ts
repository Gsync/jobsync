import { tool } from "ai";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_TOOL_DESCRIPTIONS } from "@/lib/agent/prompt";
import { classifyDescriptionCompleteness } from "@/lib/jobs/descriptionCompleteness";
import { scrapeJobPosting } from "@/lib/scraper/jobPosting";
import type { ScraperError } from "@/lib/scraper/types";
import { AgentScrapeJobSchema } from "@/models/agent.schema";
import type { AgentScrapeJobResult } from "@/models/agent.model";
import { log } from "@/lib/telemetry";

function failure(error: ScraperError): AgentScrapeJobResult {
  switch (error.type) {
    case "blocked":
      return { status: "blocked", reason: error.reason };
    case "rate_limited":
      return {
        status: "fetch_failed",
        reason: "The site is rate-limiting requests. Try again in a minute, or paste the posting.",
      };
    case "too_large":
      return { status: "too_large", reason: error.message };
    case "parse":
      return { status: "not_job_posting", reason: error.message };
    case "network":
      return { status: "fetch_failed", reason: error.message };
  }
}

/**
 * Reads a job posting the user linked and hands the model structured fields.
 * It is deliberately not approval-gated: it writes nothing and reads a public
 * page. add_job remains the only write, and the user confirms that separately.
 */
export function buildScrapeJobTool() {
  return tool({
    description: AGENT_TOOL_DESCRIPTIONS.scrape_job,
    inputSchema: AgentScrapeJobSchema,
    execute: async (
      input,
      { abortSignal },
    ): Promise<AgentScrapeJobResult> => {
      const result = await scrapeJobPosting(input.jobUrl, {
        signal: abortSignal,
      });

      if (!result.success) {
        log.info("[agent-chat] scrape_job failed", {
          type: result.error.type,
          url: input.jobUrl,
        });
        return failure(result.error);
      }

      const posting = result.data;
      if (!posting.title || posting.description.trim().length < 20) {
        return {
          status: "not_job_posting",
          reason:
            "The page loaded, but it did not contain a readable job posting. Paste the posting text instead.",
        };
      }

      const description = posting.description.slice(
        0,
        APP_CONSTANTS.SCRAPE_AGENT_DESCRIPTION_MAX_CHARS,
      );
      const descriptionTruncated =
        Boolean(posting.descriptionTruncated) ||
        posting.description.length > description.length;

      const warnings = [...(posting.warnings ?? [])];
      if (descriptionTruncated) {
        warnings.push(
          "The description was shortened here; add_job still saves the full posting.",
        );
      }

      return {
        status: "ok",
        jobUrl: posting.url,
        company: posting.company,
        jobTitle: posting.title,
        jobDescription: description,
        descriptionChars: posting.description.length,
        descriptionCompleteness: classifyDescriptionCompleteness(
          posting.description,
        ),
        descriptionTruncated,
        structuredData: Boolean(posting.structuredData),
        location: posting.location || undefined,
        source: posting.source,
        jobType: posting.employmentType,
        workplaceType: posting.workplaceType,
        salaryRange: posting.salary,
        postedDate: posting.postedDate,
        tags: posting.skills,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  });
}
