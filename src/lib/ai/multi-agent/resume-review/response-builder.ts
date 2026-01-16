/**
 * Resume Review Response Builder
 *
 * Handles building the final ResumeReviewResponse from agent results.
 */

import { ResumeReviewResponse } from "@/models/ai.model";

interface FeedbackResultInput {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export function buildResumeReviewResponse(
  validatedScore: number,
  feedbackResult: FeedbackResultInput
): ResumeReviewResponse {
  const scoreCategory =
    validatedScore >= 70
      ? "above average"
      : validatedScore >= 50
      ? "average"
      : "below average";

  const summary = `This resume scores ${validatedScore}/100, which is ${scoreCategory}. ${
    feedbackResult.strengths[0] || "Multiple strengths identified."
  }`;

  return {
    score: validatedScore,
    summary,
    strengths: feedbackResult.strengths,
    weaknesses: feedbackResult.weaknesses,
    suggestions: feedbackResult.suggestions,
  };
}
