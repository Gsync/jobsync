import { z } from "zod";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { McpSaveMatchResultSchema } from "@/models/mcp.schema";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { parseJobMatch } from "@/lib/ai/jobMatch/parse";
import type { JobMatchData } from "@/models/ai.schemas";

type SaveMatchResponse = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    saved: boolean;
    jobId: string;
    score: number | null;
    recommendation: string | null;
    errorCode: string | null;
  };
};

function matchResponse(
  jobId: string,
  text: string,
  options: {
    saved?: boolean;
    score?: number;
    recommendation?: string;
    errorCode?: string;
  } = {},
): SaveMatchResponse {
  return {
    content: [{ type: "text", text }],
    structuredContent: {
      saved: options.saved ?? false,
      jobId,
      score: options.score ?? null,
      recommendation: options.recommendation ?? null,
      errorCode: options.errorCode ?? null,
    },
  };
}

export async function handleSaveMatchResult(
  input: z.infer<typeof McpSaveMatchResultSchema>,
  userId: string,
  tokenName: string,
): Promise<SaveMatchResponse> {
  // Shares add_job's bucket by design. At the exact window boundary a match can
  // be computed but rejected here; accepted — the user can retry or match
  // in-app, and nothing is left in a corrupt state.
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return matchResponse(
      input.jobId,
      `Rate limit exceeded. Try again in ${resetSec}s.`,
      { errorCode: "rate_limited" },
    );
  }

  const parsed = parseJobMatch(input.matchText);
  if (!parsed.scores) {
    return matchResponse(
      input.jobId,
      "Could not parse a SCORES line. Include a leading 'SCORES: " +
        "match=<0-100> recommendation=<strong|good|partial|weak>' line.",
      { errorCode: "invalid_match_format" },
    );
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
  if (!resume) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultResumeId: true },
    });
    resume = user?.defaultResumeId
      ? await prisma.resume.findFirst({
          where: { id: user.defaultResumeId, profile: { userId } },
          select: { id: true, title: true },
        })
      : null;
  }

  const matchData: JobMatchData = {
    matchScore: parsed.scores.matchScore,
    recommendation: parsed.scores.recommendation,
    body: parsed.body,
    resumeId: resume?.id,
    resumeTitle: resume?.title,
    matchedAt: new Date().toISOString(),
    provider: APP_CONSTANTS.MCP_MATCH_PROVIDER_MARKER,
    model: tokenName,
    analyzed: true,
  };

  try {
    await prisma.job.update({
      where: { id: input.jobId, userId, createdVia: { not: null } },
      data: {
        matchScore: parsed.scores.matchScore,
        matchData: JSON.stringify(matchData),
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return matchResponse(
        input.jobId,
        "Job not found, not owned by this token's user, or not eligible for a match via MCP.",
        { errorCode: "not_found_or_forbidden" },
      );
    }
    return matchResponse(
      input.jobId,
      `Error: ${error?.message ?? "Unknown error"}`,
      { errorCode: "internal_error" },
    );
  }

  return matchResponse(
    input.jobId,
    `Match saved for job ${input.jobId}: ${parsed.scores.recommendation} (score ${parsed.scores.matchScore}).`,
    {
      saved: true,
      score: parsed.scores.matchScore,
      recommendation: parsed.scores.recommendation,
    },
  );
}
