import { z } from "zod";

/**
 * Schema for resume review AI response.
 * Uses .describe() to guide the LLM on expected output.
 */
export const ResumeReviewSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "MUST be a number 0-100. Sum of all 8 steps: Keywords(0-20) + Quantified(0-25) + Verbs(0-10) + Formatting(0-15) + Summary(0-10) + Clarity(0-10) + Skills(0-5) + Grammar(0-5). Example: if Keywords=12, Quantified=15, Verbs=7, Formatting=10, Summary=6, Clarity=8, Skills=4, Grammar=4, then score=66. Typical range: 40-70. NEVER return 0 unless blank resume."
    ),
  summary: z
    .string()
    .describe(
      "2-3 sentences. State the score level (e.g., 'This scores 66/100, which is average'). Mention top strength and top weakness. Be direct."
    ),
  strengths: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "List 1-5 specific strengths with examples from the resume. Format: 'Strength: specific example'. Be concrete."
    ),
  weaknesses: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "List 1-5 specific weaknesses. Format: 'Weakness: why it matters'. Be honest but constructive."
    ),
  suggestions: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "List 1-5 actionable improvements. Format: 'Action: how to do it'. Be specific and practical."
    ),
});

export type ResumeReviewResponse = z.infer<typeof ResumeReviewSchema>;

/**
 * Schema for analysis category used in job match response.
 */
const AnalysisCategorySchema = z.object({
  category: z
    .string()
    .describe(
      "Category title with score if applicable, e.g., 'ATS Friendliness (60/100)' or 'Skill Match'"
    ),
  value: z
    .array(z.string())
    .describe(
      "List of specific observations or recommendations for this category."
    ),
});

export type JobMatchAnalysis = z.infer<typeof AnalysisCategorySchema>;

/**
 * Schema for job match AI response.
 */
export const JobMatchSchema = z.object({
  matching_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "MUST be a number 0-100. Sum of all 5 steps: Skills(0-30) + Experience(0-25) + Keywords(0-20) + Qualifications(0-15) + Industry(0-10). Example: if Skills=15, Experience=12, Keywords=10, Quals=8, Industry=5, then matching_score=50. Typical range: 30-65. NEVER return 0 unless completely unrelated."
    ),
  detailed_analysis: z
    .array(AnalysisCategorySchema)
    .min(3)
    .max(5)
    .describe(
      "Array of 3-5 analysis categories showing your scoring. MUST include: 'Skills Match (X/30 pts): [list what matched]', 'Experience Match (X/25 pts): [details]', 'Keyword Overlap (X/20 pts): [examples]'. Optional: Qualifications and Industry categories. Be specific about what was found vs missing."
    ),
  suggestions: z
    .array(AnalysisCategorySchema)
    .min(2)
    .max(4)
    .describe(
      "Array of 2-4 suggestion categories. Examples: 'Missing Keywords to Add: [actual terms from job description]', 'Skills to Highlight: [specific items from resume to emphasize]', 'Gaps to Address: [what's missing]'. Be concrete and actionable."
    ),
  additional_comments: z
    .array(z.string())
    .max(3)
    .describe(
      "2-3 brief summary statements. Include: overall candidacy assessment, top priority improvement, application timeline recommendation (e.g., 'Apply after adding X skill' or 'Strong candidate, apply now')."
    ),
});

export type JobMatchResponse = z.infer<typeof JobMatchSchema>;
