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

/**
 * Schema for analysis category used in job match response.
 */
const AnalysisCategorySchema = z.object({
  category: z.string().describe(
    `Category title with score breakdown.

      Format: "[Category Name] ([X]/[Max] pts)"

      Examples:
      - "Skills Match (22/30 pts)"
      - "Experience Match (18/25 pts)"
      - "Keyword Overlap (14/20 pts)"
      - "Qualifications (10/15 pts)"
      - "Industry Fit (7/10 pts)"`,
  ),
  value: z.array(z.string()).describe(
    `List of specific observations with EVIDENCE.

      For Skills Match:
      - "✅ React: Found 'Led React migration to v18' in resume"
      - "✅ TypeScript: Mentioned 5 times across experience section"
      - "⚠️ PostgreSQL: Has MySQL experience (related, not exact)"
      - "❌ Kubernetes: Not found in resume"

      For Experience Match:
      - "Required: 5+ years backend development"
      - "Candidate: 6 years at similar companies (exceeds)"
      - "Quality: Led team, built microservices at scale"

      For Keyword Overlap:
      - "Found: React, TypeScript, Node.js, AWS, Docker, Agile, REST API (7 of 10)"
      - "Missing: Kubernetes, Redis, GraphQL (3 of 10)"`,
  ),
});

export type JobMatchAnalysis = z.infer<typeof AnalysisCategorySchema>;

/**
 * Schema for job match AI response.
 * Designed for maximum actionability and transparency.
 */
export const JobMatchSchema = z.object({
  matching_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      `MUST be a number 0-100. Calculate as sum of 5 criteria:
      - Skills Match (0-30): (matched_skills / required_skills) × 30
      - Experience Match (0-25): Based on years and relevance
      - Keyword Overlap (0-20): (found_keywords / job_keywords) × 20
      - Qualifications (0-15): Education and certifications
      - Industry Fit (0-10): Domain relevance

      Realistic ranges:
      - 80+: Excellent match, interview likely
      - 65-79: Strong match, apply with confidence
      - 50-64: Moderate match, tailor resume
      - 35-49: Weak match, consider upskilling
      - <35: Poor match, may not be right fit

      Most candidates score 40-60 against any given job.
      NEVER return 0 unless completely unrelated industry/role.`,
    ),
  detailed_analysis: z
    .array(AnalysisCategorySchema)
    .min(3)
    .max(5)
    .describe(
      `Array of 3-5 analysis categories showing your scoring breakdown.

      REQUIRED categories (must include these 3):
      1. "Skills Match (X/30 pts)" - List each required skill with ✅/⚠️/❌ and evidence
      2. "Experience Match (X/25 pts)" - Compare years, relevance, quality
      3. "Keyword Overlap (X/20 pts)" - List found vs missing keywords

      OPTIONAL categories (include if relevant):
      4. "Qualifications (X/15 pts)" - Education, certifications match
      5. "Industry Fit (X/10 pts)" - Domain knowledge assessment

      Each category MUST have specific evidence, not vague statements.`,
    ),
  suggestions: z
    .array(AnalysisCategorySchema)
    .min(2)
    .max(4)
    .describe(
      `Array of 2-4 suggestion categories with ACTIONABLE improvements.

      Recommended categories:

      1. "Keywords to Add to Resume" (Quick Win):
         - List EXACT terms from job description missing from resume
         - Example: ["Add 'Kubernetes' to skills section", "Include 'GraphQL' in project descriptions"]

      2. "Skills to Highlight" (Quick Win):
         - Existing resume content to emphasize more
         - Example: ["Move AWS experience to top of skills", "Expand on React migration project"]

      3. "Experience Gaps to Address" (Short-term):
         - Certifications to obtain
         - Portfolio pieces to create
         - Example: ["Get AWS Solutions Architect cert", "Build a Kubernetes demo project"]

      4. "Skills to Develop" (Long-term):
         - New skills to learn for better match
         - Example: ["Learn GraphQL fundamentals", "Get hands-on with PostgreSQL"]

      Each suggestion must be SPECIFIC and IMPLEMENTABLE.`,
    ),
  additional_comments: z
    .array(z.string())
    .min(2)
    .max(3)
    .describe(
      `2-3 brief statements that MUST include:

      1. Overall candidacy assessment:
         - "Strong candidate with 70% skill match and relevant experience"
         - "Moderate fit - has core skills but missing 2 key requirements"

      2. Top priority action:
         - "Priority: Add PostgreSQL experience or equivalent database skills"
         - "Priority: Quantify your React project impact"

      3. Clear application recommendation:
         - "Recommendation: Apply now - strong match"
         - "Recommendation: Apply after adding missing keywords to resume"
         - "Recommendation: Consider upskilling in [X] before applying"
         - "Recommendation: This role may not be the best fit currently"

      Be direct and honest about fit. Don't sugarcoat poor matches.`,
    ),
});

export type JobMatchResponse = z.infer<typeof JobMatchSchema>;

// ============================================================================
// SEMANTIC EXTRACTION SCHEMAS (Phase 1 Improvements)
// ============================================================================

/**
 * Schema for LLM-based keyword/skill extraction
 * Replaces hard-coded keyword lists with dynamic extraction
 */
export const SemanticKeywordSchema = z.object({
  technical_skills: z.array(z.string()).describe(
    `Programming languages, frameworks, libraries extracted from text.
      Examples: ["Python", "React", "TypeScript", "Django", "TensorFlow"]
      Be comprehensive - extract ALL technical skills mentioned.`,
  ),
  tools_platforms: z.array(z.string()).describe(
    `Development tools, platforms, services, and cloud providers.
      Examples: ["Docker", "Kubernetes", "AWS", "GitHub Actions", "JIRA", "Figma"]
      Include both infrastructure and productivity tools.`,
  ),
  methodologies: z.array(z.string()).describe(
    `Development methodologies, practices, and processes.
      Examples: ["Agile", "Scrum", "TDD", "CI/CD", "DevOps", "Microservices"]
      Include architectural patterns and best practices.`,
  ),
  domain_knowledge: z.array(z.string()).describe(
    `Industry-specific knowledge and compliance frameworks.
      Examples: ["Healthcare", "HIPAA", "FinTech", "SOX", "GDPR", "FDA regulations"]
      Include certifications and domain expertise.`,
  ),
  soft_skills: z.array(z.string()).describe(
    `Leadership and interpersonal skills mentioned.
      Examples: ["Team leadership", "Cross-functional collaboration", "Mentoring"]
      Only include if explicitly stated or clearly demonstrated.`,
  ),
  total_count: z
    .number()
    .describe("Total unique keywords across all categories"),
});

export type SemanticKeywordExtraction = z.infer<typeof SemanticKeywordSchema>;

/**
 * Schema for action verb analysis
 * Replaces hard-coded verb lists with semantic strength assessment
 */
export const ActionVerbAnalysisSchema = z.object({
  strong_verbs: z
    .array(
      z.object({
        verb: z.string().describe("The action verb found"),
        context: z
          .string()
          .describe("Brief context where it was used (max 50 chars)"),
        impact_level: z
          .enum(["high", "medium"])
          .describe(
            "High: Led, Architected, Spearheaded, Delivered. Medium: Managed, Developed, Implemented",
          ),
      }),
    )
    .describe(
      `Strong action verbs that demonstrate ownership and impact.
      High impact: Led, Architected, Spearheaded, Delivered, Drove, Built, Scaled, Transformed
      Medium impact: Managed, Developed, Implemented, Created, Designed, Coordinated`,
    ),
  weak_verbs: z
    .array(
      z.object({
        verb: z.string().describe("The weak verb/phrase found"),
        context: z
          .string()
          .describe("Brief context where it was used (max 50 chars)"),
        suggestion: z
          .string()
          .describe("Stronger alternative verb to use instead"),
      }),
    )
    .describe(
      `Weak verbs/phrases that reduce impact.
      Examples: "Responsible for", "Helped with", "Assisted in", "Worked on", "Involved in"
      These should be replaced with action-oriented alternatives.`,
    ),
  verb_strength_score: z
    .number()
    .min(0)
    .max(10)
    .describe(
      `Overall verb strength score 0-10:
      0-3: Mostly passive language
      4-6: Mix of strong and weak verbs
      7-8: Predominantly strong verbs
      9-10: Exceptional action-oriented language throughout`,
    ),
});

export type ActionVerbAnalysis = z.infer<typeof ActionVerbAnalysisSchema>;

/**
 * Combined schema for resume analysis (keywords + verbs)
 * Single LLM call instead of two separate calls
 */
export const CombinedResumeAnalysisSchema = z.object({
  keywords: SemanticKeywordSchema.describe(
    "All keywords and skills extracted from the resume",
  ),
  verbs: ActionVerbAnalysisSchema.describe(
    "Action verb analysis with strength assessment",
  ),
});

export type CombinedResumeAnalysis = z.infer<
  typeof CombinedResumeAnalysisSchema
>;

/**
 * Schema for skill matching between resume and job
 * Provides semantic similarity scoring, not just string matching
 */
export const SemanticSkillMatchSchema = z.object({
  exact_matches: z
    .array(
      z.object({
        skill: z.string().min(1).describe("The skill that matches exactly"),
        resume_evidence: z
          .string()
          .min(1)
          .describe("Quote from resume showing this skill"),
        job_requirement: z
          .string()
          .min(1)
          .describe("Quote from job showing this requirement"),
      }),
    )
    .describe("Skills that match exactly between resume and job"),
  related_matches: z
    .array(
      z.object({
        job_skill: z.string().min(1).describe("Skill required by job"),
        resume_skill: z.string().min(1).describe("Related skill in resume"),
        similarity: z
          .number()
          .min(0)
          .max(100)
          .describe("Similarity percentage (e.g., PostgreSQL vs MySQL = 85%)"),
        explanation: z
          .string()
          .min(1)
          .describe("Why these skills are related/transferable"),
      }),
    )
    .describe(
      "Skills that are related/similar but not exact matches (e.g., React vs Vue, PostgreSQL vs MySQL)",
    ),
  missing_skills: z
    .array(
      z.object({
        skill: z.string().min(1).describe("Required skill not found in resume"),
        importance: z
          .enum(["critical", "important", "nice-to-have"])
          .describe("How important this skill is for the role"),
        learnability: z
          .enum(["quick", "moderate", "significant"])
          .describe(
            "How quickly this could be learned: quick (<1 month), moderate (1-3 months), significant (3+ months)",
          ),
      }),
    )
    .describe("Skills required by job but not found in resume"),
  overall_match_percentage: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Overall skill match percentage considering exact + related matches",
    ),
});

export type SemanticSkillMatch = z.infer<typeof SemanticSkillMatchSchema>;

// ============================================================================
// PHASE 3: SEMANTIC SIMILARITY SCHEMA
// Complete semantic understanding with explanations
// ============================================================================

/**
 * Schema for comprehensive semantic similarity analysis
 * Replaces keyword overlap with true semantic understanding
 */
export const SemanticSimilaritySchema = z.object({
  similarity_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      `Overall semantic similarity score (0-100) based on:
      - Skills alignment (exact + transferable)
      - Experience relevance (years, seniority, industry)
      - Role fit (career trajectory alignment)
      - Culture signals (values, working style)

      Guidelines:
      80-100: Exceptional fit
      65-79: Strong fit
      50-64: Moderate fit
      35-49: Weak fit
      0-34: Poor fit`,
    ),

  match_explanation: z.string().describe(
    `2-3 sentence explanation of why this candidate is/isn't a good fit.
      Start with the key reason (e.g., "Strong technical alignment with 80% skill match...")
      Include both positives and concerns.`,
  ),

  key_matches: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      `Top 3-5 areas where candidate strongly matches requirements.
      Examples: "5+ years React experience matches requirement",
      "Led team of 8 engineers, exceeds leadership requirement"`,
    ),

  key_gaps: z
    .array(
      z.object({
        skill: z.string().describe("The skill or requirement that's missing"),
        note: z
          .string()
          .describe("Brief note on gap severity or how to address"),
      }),
    )
    .max(5)
    .describe(
      `Top 3-5 gaps between resume and job requirements.
      Include severity/importance of each gap.`,
    ),

  transferable_skills: z
    .array(
      z.object({
        resume_skill: z.string().describe("Skill the candidate has"),
        job_skill: z.string().describe("Required skill it could transfer to"),
        how_it_transfers: z
          .string()
          .describe("Brief explanation of transferability"),
      }),
    )
    .max(4)
    .describe(
      `Skills in resume that could apply to missing requirements.
      Example: MySQL knowledge transfers to PostgreSQL (both SQL databases)`,
    ),

  application_recommendation: z.string().describe(
    `Clear, actionable recommendation.
      Examples:
      - "Apply now - strong match, highlight your React migration project"
      - "Apply after adding Docker basics - critical gap for this role"
      - "Consider upskilling in Kubernetes before applying - key requirement"
      - "May not be the best fit - role requires senior-level system design"`,
  ),
});

export type SemanticSimilarityResult = z.infer<typeof SemanticSimilaritySchema>;
