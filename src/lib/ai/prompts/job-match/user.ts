/**
 * Job Match User Prompts
 * Functions to construct user prompts for job match analysis.
 */

/**
 * Build user prompt for single comprehensive job match analysis
 */
export function buildJobMatchPrompt(
  resumeText: string,
  jobDescription: string
): string {
  return `Compare this resume against the job description and return a JSON analysis.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Analyze the match and provide:
- matchScore (0-100)
- recommendation (strong match/good match/partial match/weak match)
- requirements analysis (met, missing, partial)
- skills comparison (matched, missing, transferable, bonus)
- experience assessment (level match, years, relevance)
- keywords (matched, missing, phrases to add)
- dealBreakers (critical missing requirements)
- tailoringTips (specific resume changes)
- summary (2-3 sentence assessment)

Be specific. Reference actual content from both documents.`;
}
