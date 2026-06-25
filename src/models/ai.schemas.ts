import { z } from "zod";

// RESUME REVIEW SCORES SCHEMA
// The review body is free-form markdown; only the four scores are structured
// (they drive the radial chart and score grid).

export const ResumeScoresSchema = z.object({
  overall: z.number().min(0).max(100),
  impact: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  atsCompatibility: z.number().min(0).max(100),
});

export type ResumeScores = z.infer<typeof ResumeScoresSchema>;

// JOB MATCH SCHEMA
// Single LLM call for comprehensive job-resume matching

const RequirementMetSchema = z.object({
  requirement: z.string().describe("What the JD asked for"),
  evidence: z.string().describe("Where/how the resume demonstrates this"),
});

const RequirementMissingSchema = z.object({
  requirement: z.string().describe("What the JD asked for"),
  importance: z.enum(["required", "preferred"]).describe("How critical this requirement is"),
  suggestion: z.string().describe("How to address this gap"),
});

const RequirementPartialSchema = z.object({
  requirement: z.string().describe("What the JD asked for"),
  gap: z.string().describe("What's lacking or incomplete"),
  evidence: z.string().describe("What the resume does show"),
});

const RequirementsSchema = z.object({
  met: z.array(RequirementMetSchema).describe("Requirements fully satisfied by the resume"),
  missing: z.array(RequirementMissingSchema).describe("Requirements not found in the resume"),
  partial: z.array(RequirementPartialSchema).describe("Requirements partially met"),
});

const SkillsAnalysisSchema = z.object({
  matched: z.array(z.string()).describe("Skills that align between resume and JD"),
  missing: z.array(z.string()).describe("Required skills not found in resume"),
  transferable: z.array(z.string()).describe("Resume skills that could apply but aren't exact match"),
  bonus: z.array(z.string()).describe("Resume skills beyond JD requirements"),
});

const ExperienceAnalysisSchema = z.object({
  levelMatch: z
    .enum(["overqualified", "match", "underqualified"])
    .describe("How candidate's level compares to requirements"),
  yearsRequired: z
    .number()
    .nullable()
    .describe("Years of experience required by JD, null if not specified"),
  yearsApparent: z.number().describe("Apparent years of experience from resume"),
  relevance: z
    .enum(["highly relevant", "somewhat relevant", "different field"])
    .describe("How relevant the candidate's experience is to this role"),
});

const KeywordsAnalysisSchema = z.object({
  matched: z.array(z.string()).describe("JD keywords found in resume"),
  missing: z.array(z.string()).describe("Important JD keywords to add"),
  addToResume: z.array(z.string()).describe("Exact phrases from JD to incorporate"),
});

const TailoringTipSchema = z.object({
  section: z.string().describe("Which resume section to modify"),
  action: z.string().describe("Specific change to make"),
});

/**
 * Comprehensive Job Match Schema
 * Single LLM call returns complete job-resume fit analysis
 */
export const JobMatchSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      `Overall match score 0-100. Realistic ranges:
      - 80-100: Strong match, high interview likelihood
      - 65-79: Good match, apply with confidence
      - 50-64: Partial match, tailor resume carefully
      - 35-49: Weak match, significant gaps exist
      - <35: Poor match, consider other roles`,
    ),
  recommendation: z
    .enum(["strong match", "good match", "partial match", "weak match"])
    .describe("Overall recommendation based on match analysis"),
  requirements: RequirementsSchema.describe("Detailed requirements matching analysis"),
  skills: SkillsAnalysisSchema.describe("Skills comparison between resume and JD"),
  experience: ExperienceAnalysisSchema.describe("Experience level and relevance assessment"),
  keywords: KeywordsAnalysisSchema.describe("Keyword overlap and gaps"),
  dealBreakers: z
    .array(z.string())
    .describe("Critical requirements completely missing that may disqualify candidate"),
  tailoringTips: z
    .array(TailoringTipSchema)
    .min(1)
    .max(5)
    .describe("Specific, actionable resume modifications to improve match"),
  summary: z
    .string()
    .describe("2-3 sentence assessment of fit and main action items"),
});

export type JobMatchResponse = z.infer<typeof JobMatchSchema>;
export type RequirementMet = z.infer<typeof RequirementMetSchema>;
export type RequirementMissing = z.infer<typeof RequirementMissingSchema>;
export type RequirementPartial = z.infer<typeof RequirementPartialSchema>;
export type SkillsAnalysis = z.infer<typeof SkillsAnalysisSchema>;
export type ExperienceAnalysis = z.infer<typeof ExperienceAnalysisSchema>;
export type KeywordsAnalysis = z.infer<typeof KeywordsAnalysisSchema>;
export type TailoringTip = z.infer<typeof TailoringTipSchema>;
