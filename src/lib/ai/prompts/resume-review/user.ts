/**
 * Resume Review User Prompt
 * Constructs the user prompt for the markdown resume review.
 */

export function buildResumeReviewPrompt(resumeText: string): string {
  return `Review the following resume.

<resume>
${resumeText}
</resume>

Start with the SCORES line, then the Markdown review, exactly as described in your instructions.`;
}
