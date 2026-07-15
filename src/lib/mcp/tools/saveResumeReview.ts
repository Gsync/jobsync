import { z } from "zod";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { McpSaveResumeReviewSchema } from "@/models/mcp.schema";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { parseResumeReview } from "@/lib/ai/resumeReview/parse";
import type { ResumeReviewData } from "@/models/ai.schemas";

export async function handleSaveResumeReview(
  input: z.infer<typeof McpSaveResumeReviewSchema>,
  userId: string,
  tokenName: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  // Shares review_resume's bucket by design. At the exact window boundary a
  // review can be computed but rejected here; accepted — the user can retry
  // or review in-app, and nothing is left in a corrupt state.
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [
        { type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` },
      ],
    };
  }

  const parsed = parseResumeReview(input.reviewText);
  if (!parsed.scores) {
    return {
      content: [
        {
          type: "text",
          text:
            "Could not parse a SCORES line. Include a leading 'SCORES: " +
            "overall=<0-100> impact=<0-100> clarity=<0-100> ats=<0-100>' line.",
        },
      ],
    };
  }

  const reviewData: ResumeReviewData = {
    overall: parsed.scores.overall,
    impact: parsed.scores.impact,
    clarity: parsed.scores.clarity,
    atsCompatibility: parsed.scores.atsCompatibility,
    body: parsed.body,
    reviewedAt: new Date().toISOString(),
    provider: APP_CONSTANTS.MCP_MATCH_PROVIDER_MARKER,
    model: tokenName,
  };

  // No separate ownership findFirst — the update `where` already enforces
  // ownership and throws P2025 when the resume isn't the user's or no longer
  // exists (unlike saveMatchResult's findFirst, which earns its keep by
  // fetching `title` for provenance; ResumeReviewData has no such field).
  try {
    await prisma.resume.update({
      where: { id: input.resumeId, profile: { userId } },
      data: { reviewData: JSON.stringify(reviewData) },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return {
        content: [
          {
            type: "text",
            text: "Resume not found or not owned by this token's user.",
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
        text: `Review saved for resume ${input.resumeId} (overall score ${parsed.scores.overall}).`,
      },
    ],
  };
}
