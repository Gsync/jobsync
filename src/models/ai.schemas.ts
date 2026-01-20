import { z } from "zod";

// COMPREHENSIVE RESUME REVIEW SCHEMA
// Single LLM call with detailed structured output

const ScoresSchema = z.object({
  overall: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall resume score 0-100. Entry-level: 35-50, Mid: 45-65, Senior: 55-75, Exceptional: >75"),
  impact: z
    .number()
    .min(0)
    .max(100)
    .describe("Impact score based on quantified achievements, measurable results, and business value demonstrated"),
  clarity: z
    .number()
    .min(0)
    .max(100)
    .describe("Clarity score based on readability, organization, STAR format usage, and professional writing"),
  atsCompatibility: z
    .number()
    .min(0)
    .max(100)
    .describe("ATS compatibility score based on formatting, keywords, standard sections, and parsability"),
});

const AchievementsSchema = z.object({
  strong: z
    .array(z.string())
    .describe("List achievements with measurable impact (numbers, %, $). Quote actual text from resume."),
  weak: z
    .array(z.string())
    .describe("List vague statements that need quantification. Quote actual text that lacks metrics."),
  missingMetrics: z
    .array(z.string())
    .describe("Suggest specific metrics that could be added (e.g., 'Add team size to Managed project' or 'Quantify cost savings')"),
});

const KeywordsSchema = z.object({
  found: z
    .array(z.string())
    .describe("Relevant industry/role keywords present in resume (technologies, tools, methodologies, domain terms)"),
  missing: z
    .array(z.string())
    .describe("Important keywords that should be added based on typical role requirements"),
  overused: z
    .array(z.string())
    .describe("Buzzwords or clichés used too frequently (e.g., 'synergy', 'results-driven', 'team player')"),
});

const VerbSuggestionSchema = z.object({
  replace: z.string().describe("Weak verb to replace"),
  with: z.string().describe("Stronger alternative verb"),
});

const ActionVerbsSchema = z.object({
  strong: z
    .array(z.string())
    .describe("Powerful verbs used effectively (e.g., Led, Architected, Spearheaded, Delivered, Transformed)"),
  weak: z
    .array(z.string())
    .describe("Weak verbs that should be replaced (e.g., 'Responsible for', 'Helped with', 'Worked on')"),
  suggestions: z
    .array(VerbSuggestionSchema)
    .describe("Specific verb replacement suggestions with context"),
});

const SectionFeedbackItemSchema = z.object({
  status: z.enum(["good", "needsWork", "missing"]).describe("Section status assessment"),
  feedback: z.string().describe("Specific actionable advice for this section"),
});

const ImprovementSchema = z.object({
  priority: z.number().min(1).max(5).describe("Priority ranking 1-5, where 1 is highest priority"),
  issue: z.string().describe("What's wrong - be specific"),
  fix: z.string().describe("How to fix it - be actionable"),
});

const GrammarErrorSchema = z.object({
  text: z.string().describe("Exact text containing the error"),
  issue: z.string().describe("What's wrong with it"),
  correction: z.string().describe("Corrected version"),
});

const GrammarAndSpellingSchema = z.object({
  errors: z
    .array(GrammarErrorSchema)
    .describe("Grammar and spelling errors found"),
  punctuationIssues: z
    .array(z.string())
    .describe("Punctuation issues (e.g., inconsistent periods, comma problems)"),
  consistencyIssues: z
    .array(z.string())
    .describe("Consistency issues (e.g., tense shifts, formatting inconsistencies, date format variations)"),
});

/**
 * Comprehensive Resume Review Schema
 * Single LLM call returns all analysis in structured format
 */
export const ResumeReviewSchema = z.object({
  scores: ScoresSchema.describe("Multiple score dimensions for nuanced assessment"),
  achievements: AchievementsSchema.describe("Achievement quality assessment with specific examples"),
  keywords: KeywordsSchema.describe("Keyword relevance analysis"),
  actionVerbs: ActionVerbsSchema.describe("Action verb strength analysis with suggestions"),
  sectionFeedback: z
    .record(z.string(), SectionFeedbackItemSchema)
    .describe("Section-by-section feedback keyed by section name (e.g., 'Summary', 'Experience', 'Skills', 'Education')"),
  atsIssues: z
    .array(z.string())
    .describe("Formatting or content issues that may cause ATS rejection (tables, graphics, unusual fonts, missing sections)"),
  topImprovements: z
    .array(ImprovementSchema)
    .min(3)
    .max(5)
    .describe("Top 3-5 prioritized improvement suggestions"),
  grammarAndSpelling: GrammarAndSpellingSchema.describe("Grammar, spelling, and consistency analysis"),
  summary: z
    .string()
    .describe("2-3 sentence overall assessment mentioning overall score, top strength, and most impactful improvement area"),
});

export type ResumeReviewResponse = z.infer<typeof ResumeReviewSchema>;
export type ResumeScores = z.infer<typeof ScoresSchema>;
export type ResumeAchievements = z.infer<typeof AchievementsSchema>;
export type ResumeKeywords = z.infer<typeof KeywordsSchema>;
export type ResumeActionVerbs = z.infer<typeof ActionVerbsSchema>;
export type SectionFeedback = z.infer<typeof SectionFeedbackItemSchema>;
export type ResumeImprovement = z.infer<typeof ImprovementSchema>;
export type GrammarError = z.infer<typeof GrammarErrorSchema>;
export type GrammarAndSpelling = z.infer<typeof GrammarAndSpellingSchema>;

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
