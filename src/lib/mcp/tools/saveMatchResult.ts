import { z } from "zod";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { McpSaveMatchResultSchema } from "@/models/mcp.schema";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { parseJobMatch } from "@/lib/ai/jobMatch/parse";
import { buildLlmMatchData } from "@/lib/ai/jobMatch/matchResult";
import { getDefaultResumeRefForUser } from "@/lib/jobs/getDefaultResumeForUser";
import type { DescriptionCompleteness } from "@/models/job.model";

export async function handleSaveMatchResult(
  input: z.infer<typeof McpSaveMatchResultSchema>,
  userId: string,
  tokenName: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  // Shares add_job's bucket by design. At the exact window boundary a match can
  // be computed but rejected here; accepted — the user can retry or match
  // in-app, and nothing is left in a corrupt state.
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  const parsed = parseJobMatch(input.matchText);
  if (!parsed.scores) {
    return {
      content: [
        {
          type: "text",
          text:
            "Could not parse a SCORES line. Include a leading 'SCORES: " +
            "match=<0-100> recommendation=<strong|good|partial|weak>' line.",
        },
      ],
    };
  }

  // Provenance needs only id + title, so avoid the full resume graph that
  // getDefaultResumeForUser loads for preprocessing. Prefer the resumeId
  // add_job handed the agent (the resume actually scored against); the
  // profile.userId scope bounds it to the user's own resumes. Fall back to the
  // current default if the agent didn't echo an id or it no longer resolves.
  let resume =
    input.resumeId != null
      ? await prisma.resume.findFirst({
          where: { id: input.resumeId, profile: { userId } },
          select: { id: true, title: true },
        })
      : null;
  if (!resume) resume = await getDefaultResumeRefForUser(userId);

  // Same scope as the update below, so a job the caller can't write to
  // never leaks its completeness through this read either.
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, userId, createdVia: { not: null } },
    select: { descriptionCompleteness: true },
  });

  const matchData = buildLlmMatchData({
    scores: parsed.scores,
    body: parsed.body,
    resume: resume ?? undefined,
    matchedAt: new Date(),
    provider: APP_CONSTANTS.MCP_MATCH_PROVIDER_MARKER,
    model: tokenName,
    descriptionCompleteness:
      (job?.descriptionCompleteness as DescriptionCompleteness | null) ?? undefined,
  });

  try {
    await prisma.job.update({
      where: { id: input.jobId, userId, createdVia: { not: null } },
      data: {
        matchScore: parsed.scores.matchScore,
        matchData,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return {
        content: [
          {
            type: "text",
            text: "Job not found, not owned by this token's user, or not eligible for a match via MCP.",
          },
        ],
      };
    }
    return {
      content: [{ type: "text", text: `Error: ${error?.message ?? "Unknown error"}` }],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Match saved for job ${input.jobId}: ${parsed.scores.recommendation} (score ${parsed.scores.matchScore}).`,
      },
    ],
  };
}
