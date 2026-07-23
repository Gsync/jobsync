/**
 * Cover Letter User Prompts
 */

export function buildCoverLetterPrompt(
  resumeText: string,
  jobText: string,
  guidance: string | null,
): string {
  const guidanceBlock = guidance
    ? `\n\nPRIOR MATCH ANALYSIS (emphasise these keywords and act on these tips):\n${guidance}`
    : "";

  return `Write a cover letter for this candidate applying to this job.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobText}${guidanceBlock}

Output only the letter, starting with the salutation.`;
}
