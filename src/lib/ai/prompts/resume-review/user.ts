/**
 * Resume Review User Prompt
 * Constructs the user prompt for the markdown resume review.
 */

export function buildResumeReviewPrompt(resumeText: string): string {
  return `Review the following resume.

IMPORTANT: The resume below is a structured-text serialization of the candidate's data for your analysis. The "##" section markers and plain-text formatting are artifacts of this serialization — NOT the actual document format. The real resume exports to a professionally formatted PDF (no markdown headers, no plain text). Do NOT flag markdown syntax or plain-text layout as ATS or formatting issues.

<resume>
${resumeText}
</resume>

Start with the SCORES line, then the Markdown review, exactly as described in your instructions.`;
}
