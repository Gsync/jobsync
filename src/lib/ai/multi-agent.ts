/**
 * Multi-Agent Collaboration System
 * Phase 3: Multiple specialized agents collaborate for superior analysis
 *
 * Architecture:
 * User Request → Coordinator → [Analyzer || Keyword Expert, Scoring Expert] → Synthesizer → Final Output
 *
 * Improvements:
 * - Parallel execution of independent agents
 * - Retry mechanism with exponential backoff
 * - Structured agent outputs for reliable scoring
 * - Strong typing throughout
 */

import { generateObject, generateText } from "ai";
import { z } from "zod";
import { getModel, ProviderType } from "./providers";
import { ResumeReviewSchema, JobMatchSchema } from "./schemas";
import {
  countQuantifiedAchievements,
  extractKeywords,
  countActionVerbs,
  calculateKeywordOverlap,
  analyzeFormatting,
  extractRequiredSkills,
} from "./tools";
import { ProgressStream } from "./progress-stream";
import {
  calculateResumeScore,
  calculateJobMatchScore,
  validateScore,
  calculateAllowedVariance,
  SCORING_GUIDELINES,
} from "./scoring";
import { ResumeReviewResponse, JobMatchResponse } from "@/models/ai.model";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AgentInsights {
  data: string;
  keywords: string;
  scoring: ScoringResult;
  feedback: string;
}

export interface ScoringResult {
  finalScore: number;
  adjustments: Array<{
    criterion: string;
    adjustment: number;
    reason: string;
  }>;
  math: string;
}

export interface CollaborativeResult<T> {
  analysis: T;
  agentInsights: AgentInsights;
  baselineScore: { score: number; breakdown: Record<string, number> };
  warnings?: string[];
}

export interface ToolDataResume {
  quantified: { count: number; examples: string[] };
  keywords: { keywords: string[]; count: number };
  verbs: { count: number; verbs: string[] };
  formatting: {
    hasBulletPoints: boolean;
    hasConsistentSpacing: boolean;
    averageLineLength: number;
    sectionCount: number;
  };
}

export interface ToolDataJobMatch {
  keywordOverlap: {
    overlapPercentage: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    totalJobKeywords: number;
  };
  resumeKeywords: { keywords: string[]; count: number };
  jobKeywords: { keywords: string[]; count: number };
  requiredSkills: {
    requiredSkills: string[];
    preferredSkills: string[];
    totalSkills: number;
  };
}

// Schema for structured scoring output
const ScoringResultSchema = z.object({
  finalScore: z
    .number()
    .min(0)
    .max(100)
    .describe("The final calculated score after all adjustments"),
  adjustments: z
    .array(
      z.object({
        criterion: z.string().describe("The criterion being adjusted"),
        adjustment: z
          .number()
          .describe("Points added (+) or subtracted (-) from baseline"),
        reason: z.string().describe("Brief explanation for this adjustment"),
      })
    )
    .describe("List of all adjustments made to the baseline score"),
  math: z
    .string()
    .describe(
      "Show your math: 'Baseline X + adjustment1 + adjustment2 - adjustment3 = Final Y'"
    ),
});

// ============================================================================
// RETRY MECHANISM
// ============================================================================

async function runWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `${operationName} attempt ${attempt + 1} failed:`,
        lastError.message
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `${operationName} failed after ${maxRetries + 1} attempts: ${lastError.message}`
  );
}

/**
 * Helper: Extract years of experience from resume
 */
function extractYearsOfExperience(resumeText: string): number {
  // Look for patterns like "X years", "X+ years", "X-Y years"
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\s*-\s*(\d+)\s*years/i,
  ];

  for (const pattern of patterns) {
    const match = resumeText.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  // Fallback: count job positions and estimate (rough heuristic)
  const jobMatches = resumeText.match(
    /\b(20\d{2})\s*-\s*(20\d{2}|present|current)/gi
  );
  if (jobMatches && jobMatches.length > 0) {
    return Math.min(jobMatches.length * 2, 15); // Rough estimate
  }

  return 0;
}

/**
 * Helper: Extract required years from job description
 */
function extractRequiredYears(jobText: string): number {
  // Look for patterns like "X+ years required", "minimum X years", etc.
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience\s+)?required/i,
    /minimum\s+(\d+)\+?\s*years?/i,
    /at\s+least\s+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/i,
  ];

  for (const pattern of patterns) {
    const match = jobText.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  return 0;
}

/**
 * AGENT 1: Data Analyzer Agent
 * Specializes in extracting and counting objective data
 */
const DATA_ANALYZER_PROMPT = `You are a data extraction specialist. Your only job is to analyze text and extract objective, measurable data.

For RESUME analysis, extract:
- Total number of job positions
- Total years of experience
- Number of quantified achievements (with numbers/%)
- Number of technical skills listed
- Number of action verbs used
- Formatting elements (bullets, sections, spacing)

For JOB MATCH analysis, extract:
- Required skills list (from job description)
- Required experience (years, level)
- Matched skills (present in resume)
- Missing skills (not in resume)
- Keyword overlap percentage

Respond with only factual data, no opinions or judgments.`;

/**
 * AGENT 2: Keyword Expert Agent
 * Specializes in ATS optimization and keyword strategy
 */
const KEYWORD_EXPERT_PROMPT = `You are an ATS (Applicant Tracking System) keyword optimization expert.

Your expertise:
- Identifying critical industry keywords
- Analyzing keyword density and placement
- Recognizing ATS-friendly vs ATS-hostile terms
- Understanding semantic keyword variations
- Keyword stuffing detection

For resumes: Identify keyword strengths, gaps, and optimization opportunities.
For job matches: Calculate precise keyword overlap and recommend specific additions.

Provide expert analysis on keyword optimization only.`;

/**
 * AGENT 3: Scoring Specialist Agent
 * Specializes in fair, calibrated scoring
 */
const SCORING_SPECIALIST_PROMPT = `You are a scoring calibration expert. Your role is to assign fair, realistic scores based on MATHEMATICAL CALCULATIONS.

CRITICAL RULES:
1. You MUST use the baseline score provided from the mathematical calculator
2. You can adjust UP or DOWN by maximum 10 points based on qualitative factors
3. You MUST show your exact math: baseline ± adjustments = final score
4. You MUST explain every adjustment you make

Your process:
1. Start with the CALCULATED BASELINE SCORE (this is mathematically derived from objective data)
2. Review subjective quality factors (clarity, grammar, presentation)
3. Make small adjustments (+/- 10 points max) for these factors
4. Show clear math: Baseline X + adjustment Y = Final Z
5. Justify every adjustment point by point

SCORING CONSTRAINTS:
- NEVER give a score more than 10 points different from the baseline
- Most adjustments should be ±5 points or less
- Only give ±10 points for exceptional or terrible subjective factors
- Show your work: "Baseline 67 + 5 (excellent clarity) - 2 (minor grammar) = 70"

Scoring reality check:
${SCORING_GUIDELINES.resume.excellent}
${SCORING_GUIDELINES.resume.good}
${SCORING_GUIDELINES.resume.average}
${SCORING_GUIDELINES.resume.fair}
${SCORING_GUIDELINES.resume.poor}

You are the authority on scoring accuracy - but you must respect the mathematical baseline.`;

/**
 * AGENT 4: Feedback Specialist Agent
 * Specializes in actionable, constructive feedback
 */
const FEEDBACK_SPECIALIST_PROMPT = `You are a career coach and feedback expert. Your role is to transform analysis into actionable recommendations.

Your expertise:
- Translating weaknesses into growth opportunities
- Providing specific, implementable suggestions
- Balancing encouragement with honesty
- Prioritizing high-impact improvements
- Using concrete examples

Feedback principles:
- Be specific: "Add 'Managed $2M budget'" not "add numbers"
- Be actionable: Give exact steps to improve
- Be encouraging: Frame as opportunities, not failures
- Be prioritized: Most important improvements first

Transform raw analysis into inspiring, helpful guidance.`;

/**
 * AGENT 5: Synthesis Coordinator Agent
 * Combines insights from all agents into coherent output
 */
const SYNTHESIS_COORDINATOR_PROMPT = `You are the synthesis coordinator. You receive input from 4 specialized agents and create a unified, coherent analysis.

Your responsibilities:
1. Validate consistency across agent outputs
2. Resolve any conflicting perspectives
3. Ensure the final score reflects all insights
4. Combine strengths/weaknesses from multiple viewpoints
5. Synthesize suggestions into prioritized action plan

Quality checks:
- Does the score match the feedback sentiment?
- Are suggestions addressing identified weaknesses?
- Is the analysis specific and evidence-based?
- Is the output user-friendly and actionable?

Create the final structured output that represents the collective wisdom of the agent team.`;

/**
 * Multi-Agent Resume Review Collaboration
 * Optimized with parallel execution and structured scoring
 */
export async function collaborativeResumeReview(
  resumeText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResult<ResumeReviewResponse>> {
  const model = getModel(provider, modelName);

  // Extract tool data (synchronous, fast)
  const toolData: ToolDataResume = {
    quantified: countQuantifiedAchievements(resumeText),
    keywords: extractKeywords(resumeText),
    verbs: countActionVerbs(resumeText),
    formatting: analyzeFormatting(resumeText),
  };

  // Calculate baseline score using mathematical formula
  const baselineScore = calculateResumeScore({
    quantifiedCount: toolData.quantified.count,
    keywordCount: toolData.keywords.count,
    verbCount: toolData.verbs.count,
    hasBulletPoints: toolData.formatting.hasBulletPoints,
    sectionCount: toolData.formatting.sectionCount,
  });

  // Calculate context-aware variance
  const allowedVariance = calculateAllowedVariance(baselineScore.score, "resume");
  const minScore = Math.max(0, baselineScore.score - allowedVariance);
  const maxScore = Math.min(100, baselineScore.score + allowedVariance);

  // =========================================================================
  // PARALLEL EXECUTION: Data Analyzer and Keyword Expert run simultaneously
  // =========================================================================
  progressStream?.sendStarted("data-analyzer", 1);
  progressStream?.sendStarted("keyword-expert", 2);

  const [dataAnalysis, keywordAnalysis] = await Promise.all([
    // Agent 1: Data Analyzer
    runWithRetry(
      async () => {
        const { text } = await generateText({
          model,
          system: DATA_ANALYZER_PROMPT,
          prompt: `Extract all objective data from this resume:

${resumeText}

Tool-extracted data to incorporate:
- Quantified achievements: ${toolData.quantified.count} found (Examples: ${toolData.quantified.examples.slice(0, 3).join(", ") || "none"})
- Keywords: ${toolData.keywords.count} technical terms (${toolData.keywords.keywords.slice(0, 10).join(", ")})
- Action verbs: ${toolData.verbs.count} strong verbs (${toolData.verbs.verbs.slice(0, 10).join(", ")})
- Formatting: ${toolData.formatting.sectionCount} sections, ${toolData.formatting.hasBulletPoints ? "has" : "no"} bullets

Provide a complete data extraction report.`,
          temperature: 0.1,
        });
        return text;
      },
      "Data Analyzer"
    ),

    // Agent 2: Keyword Expert (runs in parallel - doesn't need Agent 1's output)
    runWithRetry(
      async () => {
        const { text } = await generateText({
          model,
          system: KEYWORD_EXPERT_PROMPT,
          prompt: `Analyze keyword optimization for this resume:

RESUME:
${resumeText}

KEYWORDS FOUND (${toolData.keywords.count} total): ${toolData.keywords.keywords.join(", ")}

Provide expert analysis on:
1. Keyword strength (0-20 points recommendation)
2. ATS-friendliness assessment
3. Missing industry-critical keywords
4. Keyword placement optimization`,
          temperature: 0.2,
        });
        return text;
      },
      "Keyword Expert"
    ),
  ]);

  progressStream?.sendCompleted("data-analyzer", 1);
  progressStream?.sendCompleted("keyword-expert", 2);

  // =========================================================================
  // SEQUENTIAL: Scoring Specialist (needs both previous outputs)
  // Now uses structured output for reliable score extraction
  // =========================================================================
  progressStream?.sendStarted("scoring-specialist", 3);
  const scoringResult = await runWithRetry(
    async () => {
      const { object } = await generateObject({
        model,
        schema: ScoringResultSchema,
        system: SCORING_SPECIALIST_PROMPT,
        prompt: `Calculate a fair, realistic score for this resume:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT ANALYSIS:
${keywordAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

BASELINE BREAKDOWN (mathematically calculated):
- Keywords: ${baselineScore.breakdown.keywords}/20 (FIXED)
- Quantified Achievements: ${baselineScore.breakdown.achievements}/25 (FIXED)
- Action Verbs: ${baselineScore.breakdown.verbs}/10 (FIXED)
- Formatting: ${baselineScore.breakdown.formatting}/15 (FIXED)
- Professional Summary: ${baselineScore.breakdown.summary}/10 (adjustable)
- Experience Clarity: ${baselineScore.breakdown.experienceClarity}/10 (adjustable)
- Skills Section: ${baselineScore.breakdown.skillsSection}/5 (adjustable)
- Grammar: ${baselineScore.breakdown.grammar}/5 (adjustable)

YOUR TASK:
1. Review the baseline score of ${baselineScore.score}/100
2. The first 4 criteria are FIXED (based on objective counts)
3. You can ONLY adjust criteria 5-8 based on resume content quality
4. Your final score MUST be within ${allowedVariance} points of ${baselineScore.score}

STRICT REQUIREMENT: Your finalScore must be between ${minScore} and ${maxScore}.

Return a structured result with:
- finalScore: your calculated score (must be ${minScore}-${maxScore})
- adjustments: array of {criterion, adjustment, reason} for each change
- math: show "Baseline ${baselineScore.score} + adj1 + adj2 - adj3 = Final X"`,
        temperature: 0.1,
      });
      return object;
    },
    "Scoring Specialist"
  );
  progressStream?.sendCompleted("scoring-specialist", 3);

  // =========================================================================
  // SEQUENTIAL: Feedback Specialist (needs scoring result)
  // =========================================================================
  progressStream?.sendStarted("feedback-expert", 4);
  const feedbackAnalysis = await runWithRetry(
    async () => {
      const { text } = await generateText({
        model,
        system: FEEDBACK_SPECIALIST_PROMPT,
        prompt: `Create actionable feedback based on the team's analysis:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${scoringResult.adjustments.map((a) => `${a.criterion}: ${a.adjustment > 0 ? "+" : ""}${a.adjustment} (${a.reason})`).join(", ")}

Provide:
1. Top 3-5 strengths (specific examples from the resume)
2. Top 3-5 weaknesses (with impact explanation)
3. Top 3-5 actionable suggestions (concrete steps)

Make it encouraging, specific, and implementable.`,
        temperature: 0.3,
      });
      return text;
    },
    "Feedback Expert"
  );
  progressStream?.sendCompleted("feedback-expert", 4);

  // =========================================================================
  // SEQUENTIAL: Synthesis Coordinator (combines all outputs)
  // =========================================================================
  progressStream?.sendStarted("synthesis-coordinator", 5);
  const finalOutput = await runWithRetry(
    async () => {
      const { object } = await generateObject({
        model,
        schema: ResumeReviewSchema,
        system: SYNTHESIS_COORDINATOR_PROMPT,
        prompt: `Synthesize the team's analysis into the final structured output:

DATA ANALYZER:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${JSON.stringify(scoringResult.adjustments, null, 2)}

FEEDBACK SPECIALIST:
${feedbackAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

CRITICAL SCORING RULE:
The score MUST be ${scoringResult.finalScore}/100 (as calculated by Scoring Specialist).
DO NOT change this score. It has been validated to be within the acceptable range.

Create the final structured response with:
- score: ${scoringResult.finalScore} (USE THIS EXACT VALUE)
- summary (2-3 sentences overview mentioning the score)
- strengths (from Feedback Specialist)
- weaknesses (from Feedback Specialist)
- suggestions (from Feedback Specialist)

Ensure everything is consistent, specific, and actionable.`,
        temperature: 0.1,
      });
      return object;
    },
    "Synthesis Coordinator"
  );
  progressStream?.sendCompleted("synthesis-coordinator", 5);

  // VALIDATE: Ensure score is within acceptable range
  const validatedScore = validateScore(
    finalOutput.score ?? scoringResult.finalScore,
    baselineScore.score,
    allowedVariance
  );

  const validatedOutput: ResumeReviewResponse = {
    ...finalOutput,
    score: validatedScore,
  };

  return {
    analysis: validatedOutput,
    agentInsights: {
      data: dataAnalysis,
      keywords: keywordAnalysis,
      scoring: scoringResult,
      feedback: feedbackAnalysis,
    },
    baselineScore,
  };
}

/**
 * Multi-Agent Job Match Collaboration
 * Optimized with parallel execution and structured scoring
 */
export async function collaborativeJobMatch(
  resumeText: string,
  jobText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResult<JobMatchResponse>> {
  const model = getModel(provider, modelName);

  // Extract tool data (synchronous, fast)
  const toolData: ToolDataJobMatch = {
    keywordOverlap: calculateKeywordOverlap(resumeText, jobText),
    resumeKeywords: extractKeywords(resumeText),
    jobKeywords: extractKeywords(jobText),
    requiredSkills: extractRequiredSkills(jobText),
  };

  // Extract years of experience from resume and job
  const experienceYears = extractYearsOfExperience(resumeText);
  const requiredYears = extractRequiredYears(jobText);

  // Calculate baseline match score
  const baselineScore = calculateJobMatchScore({
    keywordOverlapPercent: toolData.keywordOverlap.overlapPercentage,
    matchedSkillsCount: toolData.keywordOverlap.matchedKeywords.length,
    requiredSkillsCount: toolData.keywordOverlap.totalJobKeywords,
    experienceYears,
    requiredYears,
  });

  // Calculate context-aware variance
  const allowedVariance = calculateAllowedVariance(baselineScore.score, "job-match");
  const minScore = Math.max(0, baselineScore.score - allowedVariance);
  const maxScore = Math.min(100, baselineScore.score + allowedVariance);

  // =========================================================================
  // PARALLEL EXECUTION: Data Analyzer and Keyword Expert run simultaneously
  // =========================================================================
  progressStream?.sendStarted("data-analyzer", 1);
  progressStream?.sendStarted("keyword-expert", 2);

  const [dataAnalysis, keywordAnalysis] = await Promise.all([
    // Agent 1: Data Analyzer
    runWithRetry(
      async () => {
        const { text } = await generateText({
          model,
          system: DATA_ANALYZER_PROMPT,
          prompt: `Extract matching data between this resume and job:

JOB DESCRIPTION:
${jobText}

CANDIDATE RESUME:
${resumeText}

Tool-extracted data:
- Keyword overlap: ${toolData.keywordOverlap.overlapPercentage}%
- Matched keywords: ${toolData.keywordOverlap.matchedKeywords.join(", ") || "none"}
- Missing keywords: ${toolData.keywordOverlap.missingKeywords.join(", ") || "none"}
- Required skills from parsing: ${toolData.requiredSkills.requiredSkills.length}
- Preferred skills from parsing: ${toolData.requiredSkills.preferredSkills.length}
- Candidate experience: ${experienceYears} years
- Required experience: ${requiredYears} years

Extract and list:
1. All required skills from job
2. Which are present in resume (with evidence)
3. Which are missing
4. Experience match level
5. Qualification match level`,
          temperature: 0.1,
        });
        return text;
      },
      "Data Analyzer"
    ),

    // Agent 2: Keyword Expert (runs in parallel)
    runWithRetry(
      async () => {
        const { text } = await generateText({
          model,
          system: KEYWORD_EXPERT_PROMPT,
          prompt: `Analyze keyword matching quality:

JOB KEYWORDS (${toolData.jobKeywords.count} total): ${toolData.jobKeywords.keywords.join(", ")}

RESUME KEYWORDS (${toolData.resumeKeywords.count} total): ${toolData.resumeKeywords.keywords.join(", ")}

EXACT OVERLAP: ${toolData.keywordOverlap.overlapPercentage}% (${toolData.keywordOverlap.matchedKeywords.length}/${toolData.keywordOverlap.totalJobKeywords} keywords)
- Matched: ${toolData.keywordOverlap.matchedKeywords.join(", ") || "none"}
- Missing: ${toolData.keywordOverlap.missingKeywords.join(", ") || "none"}

Provide expert analysis on:
1. Keyword match quality assessment
2. Critical missing keywords (highest priority)
3. Keywords to emphasize in application
4. Semantic variations candidate could leverage
5. Keyword Overlap score recommendation (0-20 points)`,
          temperature: 0.2,
        });
        return text;
      },
      "Keyword Expert"
    ),
  ]);

  progressStream?.sendCompleted("data-analyzer", 1);
  progressStream?.sendCompleted("keyword-expert", 2);

  // =========================================================================
  // SEQUENTIAL: Scoring Specialist with structured output
  // =========================================================================
  progressStream?.sendStarted("scoring-specialist", 3);
  const scoringResult = await runWithRetry(
    async () => {
      const { object } = await generateObject({
        model,
        schema: ScoringResultSchema,
        system: SCORING_SPECIALIST_PROMPT,
        prompt: `Calculate a fair job match score:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

BASELINE BREAKDOWN (mathematically calculated):
- Skills Match: ${baselineScore.breakdown.skillsMatch}/30 (${toolData.keywordOverlap.matchedKeywords.length}/${toolData.keywordOverlap.totalJobKeywords} skills matched) - FIXED
- Experience Match: ${baselineScore.breakdown.experienceMatch}/25 (${experienceYears} years vs ${requiredYears} required) - FIXED
- Keyword Overlap: ${baselineScore.breakdown.keywordOverlap}/20 (${toolData.keywordOverlap.overlapPercentage}% overlap) - FIXED
- Qualifications: ${baselineScore.breakdown.qualifications}/15 (adjustable based on education/certs)
- Industry Fit: ${baselineScore.breakdown.industryFit}/10 (adjustable based on domain knowledge)

YOUR TASK:
1. Review the baseline score of ${baselineScore.score}/100
2. The first 3 criteria are FIXED (based on objective counts)
3. You can ONLY adjust criteria 4-5 based on qualifications and industry fit
4. Your final score MUST be within ${allowedVariance} points of ${baselineScore.score}

STRICT REQUIREMENT: Your finalScore must be between ${minScore} and ${maxScore}.

Return a structured result with:
- finalScore: your calculated score (must be ${minScore}-${maxScore})
- adjustments: array of {criterion, adjustment, reason} for each change
- math: show "Baseline ${baselineScore.score} + adj1 + adj2 = Final X"`,
        temperature: 0.1,
      });
      return object;
    },
    "Scoring Specialist"
  );
  progressStream?.sendCompleted("scoring-specialist", 3);

  // =========================================================================
  // SEQUENTIAL: Feedback Specialist
  // =========================================================================
  progressStream?.sendStarted("feedback-expert", 4);
  const feedbackAnalysis = await runWithRetry(
    async () => {
      const { text } = await generateText({
        model,
        system: FEEDBACK_SPECIALIST_PROMPT,
        prompt: `Create an application strategy based on the match analysis:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${scoringResult.adjustments.map((a) => `${a.criterion}: ${a.adjustment > 0 ? "+" : ""}${a.adjustment} (${a.reason})`).join(", ")}

Provide specific, actionable suggestions:
1. What to highlight from existing experience
2. Exact keywords/skills to add or emphasize
3. Gaps to address before applying
4. How to position transferable skills
5. Application timeline recommendation

Be very specific with examples from the resume and job description.`,
        temperature: 0.3,
      });
      return text;
    },
    "Feedback Expert"
  );
  progressStream?.sendCompleted("feedback-expert", 4);

  // =========================================================================
  // SEQUENTIAL: Synthesis Coordinator
  // =========================================================================
  progressStream?.sendStarted("synthesis-coordinator", 5);
  const finalOutput = await runWithRetry(
    async () => {
      const { object } = await generateObject({
        model,
        schema: JobMatchSchema,
        system: SYNTHESIS_COORDINATOR_PROMPT,
        prompt: `Synthesize the team's job match analysis:

DATA ANALYZER:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${JSON.stringify(scoringResult.adjustments, null, 2)}

FEEDBACK SPECIALIST:
${feedbackAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

CRITICAL SCORING RULE:
The matching_score MUST be ${scoringResult.finalScore}/100 (as calculated by Scoring Specialist).
DO NOT change this score. It has been validated to be within the acceptable range.

Create the final structured response with:
- matching_score: ${scoringResult.finalScore} (USE THIS EXACT VALUE)
- detailed_analysis (combine insights from all agents with specific counts)
- suggestions (from Feedback Specialist)
- additional_comments (overall assessment and next steps)

Each category in detailed_analysis should include specific counts and evidence.
Each suggestion should be concrete and actionable.`,
        temperature: 0.1,
      });
      return object;
    },
    "Synthesis Coordinator"
  );
  progressStream?.sendCompleted("synthesis-coordinator", 5);

  // VALIDATE: Ensure score is within acceptable range
  const validatedScore = validateScore(
    finalOutput.matching_score ?? scoringResult.finalScore,
    baselineScore.score,
    allowedVariance
  );

  const validatedOutput: JobMatchResponse = {
    ...finalOutput,
    matching_score: validatedScore,
  };

  return {
    analysis: validatedOutput,
    agentInsights: {
      data: dataAnalysis,
      keywords: keywordAnalysis,
      scoring: scoringResult,
      feedback: feedbackAnalysis,
    },
    baselineScore,
  };
}

/**
 * Quality Assurance: Validate multi-agent output
 * Returns validation result with any issues found
 * Note: provider and modelName are kept for backwards compatibility but currently unused
 */
export async function validateCollaborativeOutput(
  output: ResumeReviewResponse | JobMatchResponse,
  agentInsights: AgentInsights,
  _provider?: ProviderType,
  _modelName?: string
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // 1. Check score consistency with scoring specialist's calculation
  const isResumeReview = "score" in output;
  const outputScore = isResumeReview
    ? (output as ResumeReviewResponse).score
    : (output as JobMatchResponse).matching_score;
  const scoringScore = agentInsights.scoring.finalScore;

  if (Math.abs((outputScore ?? 0) - scoringScore) > 2) {
    issues.push(
      `Score mismatch: Output has ${outputScore}, but Scoring Specialist calculated ${scoringScore}`
    );
  }

  // 2. Check that strengths/weaknesses are not empty
  if (isResumeReview) {
    const review = output as ResumeReviewResponse;
    if (!review.strengths || review.strengths.length === 0) {
      issues.push("Missing strengths in output");
    }
    if (!review.weaknesses || review.weaknesses.length === 0) {
      issues.push("Missing weaknesses in output");
    }
    if (!review.suggestions || review.suggestions.length === 0) {
      issues.push("Missing suggestions in output");
    }
  } else {
    const match = output as JobMatchResponse;
    if (!match.detailed_analysis || match.detailed_analysis.length === 0) {
      issues.push("Missing detailed_analysis in output");
    }
    if (!match.suggestions || match.suggestions.length === 0) {
      issues.push("Missing suggestions in output");
    }
  }

  // 3. Check score is within valid range
  if (outputScore !== undefined && (outputScore < 0 || outputScore > 100)) {
    issues.push(`Invalid score: ${outputScore} is outside 0-100 range`);
  }

  // 4. Verify scoring math adds up (basic sanity check)
  const adjustmentSum = agentInsights.scoring.adjustments.reduce(
    (sum, adj) => sum + adj.adjustment,
    0
  );
  if (Math.abs(adjustmentSum) > 20) {
    issues.push(
      `Excessive adjustments: Total adjustment of ${adjustmentSum} points exceeds reasonable range`
    );
  }

  // If there are issues, optionally use AI for deeper validation
  if (issues.length === 0) {
    // Quick structural validation passed - skip expensive AI call
    return { valid: true, issues: [] };
  }

  return { valid: issues.length === 0, issues };
}
