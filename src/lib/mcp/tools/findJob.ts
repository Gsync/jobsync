import prisma from "@/lib/db";
import { findExistingJobByUrl } from "@/lib/jobs/jobDedupe";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

export async function handleFindJob(
  input: { jobUrl: string },
  userId: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  try {
    const existing = await findExistingJobByUrl(userId, input.jobUrl);
    if (!existing) {
      return {
        content: [
          {
            type: "text",
            text: "No saved job matches that URL — call add_job to create it.",
          },
        ],
      };
    }

    const detail = await prisma.job.findFirst({
      where: { id: existing.id, userId },
      select: {
        id: true,
        descriptionCompleteness: true,
        matchScore: true,
        createdVia: true,
        Status: { select: { value: true } },
        tags: { select: { label: true } },
      },
    });

    const status = detail?.Status?.value ?? "unknown";
    const completeness = detail?.descriptionCompleteness ?? "unknown";
    const score =
      detail?.matchScore != null ? `${detail.matchScore}%` : "not scored";
    const updatable = detail?.createdVia != null;
    // update_job replaces tags wholesale (no merge) — surface the current
    // list so an agent that wants to keep them can echo them back, instead
    // of silently dropping them by omission.
    const tagsList = detail?.tags?.length
      ? detail.tags.map((t) => t.label).join(", ")
      : "none";

    const text =
      `Found existing job "${existing.title}" at "${existing.company}" ` +
      `(id: ${existing.id}, status: ${status}, description: ${completeness}, ` +
      `match: ${score}, tags: ${tagsList}). ` +
      (updatable
        ? `Call update_job with jobId "${existing.id}" to enrich or correct it ` +
          `instead of adding a duplicate. Tags are replaced wholesale, not ` +
          `merged — include the existing ones above if you want to keep them.`
        : `This job was created in the web app and cannot be updated via MCP — ` +
          `edit it there instead.`);

    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}
