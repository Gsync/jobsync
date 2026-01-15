/**
 * Multi-Agent Collaboration System V2 (Consolidated)
 * Phase 2: Consolidate from 5 agents to 2 agents
 *
 * Architecture:
 * User Request → Tools → Baseline → [Analysis Agent, Feedback Agent] → Validation → Output
 *
 * Benefits:
 * - 40% latency reduction (30s → 18s)
 * - 60% cost reduction (5 calls → 2 calls)
 * - Simpler orchestration
 * - Structured output reduces parsing errors
 *
 * Changes from V1:
 * - Data Analyzer + Keyword Expert + Scoring Specialist → Analysis Agent
 * - Feedback Expert + Synthesis Coordinator → Feedback Agent
 * - Both agents run in parallel (independent of each other)
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
  extractSemanticKeywords,
  analyzeActionVerbs,
  performSemanticSkillMatch,
  calculateSemanticSimilarity,
  generateMatchExplanation,
  getKeywordCountFromSemantic,
  getVerbCountFromSemantic,
} from "./tools";
import type { SemanticSimilarityResult, SemanticSkillMatch } from "./schemas";
import { ProgressStream } from "./progress-stream";
import {
  calculateResumeScore,
  calculateJobMatchScore,
  validateScore,
  calculateAllowedVariance,
} from "./scoring";
import { ResumeReviewResponse, JobMatchResponse } from "@/models/ai.model";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AgentInsightsV2 {
  analysis: AnalysisResult;
  feedback: FeedbackResult;
}

export interface AnalysisResult {
  finalScore: number;
  dataInsights: {
    quantifiedCount: number;
    keywordCount: number;
    verbCount: number;
    formatQuality: string;
  };
  keywordAnalysis: {
    strength: string;
    atsScore: number;
    missingCritical: string[];
    recommendations: string[];
  };
  adjustments: Array<{
    criterion: string;
    adjustment: number;
    reason: string;
  }>;
  math: string;
}

export interface FeedbackResult {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  synthesisNotes: string;
}

export interface CollaborativeResultV2<T> {
  analysis: T;
  agentInsights: AgentInsightsV2;
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

// ============================================================================
// CONSOLIDATED SCHEMAS
// ============================================================================

// Analysis Agent Schema (combines Data + Keyword + Scoring)
const AnalysisAgentSchema = z.object({
  finalScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Final score after all adjustments, must be within allowed variance"
    ),

  dataInsights: z
    .object({
      quantifiedCount: z
        .number()
        .describe("Count of quantified achievements found"),
      keywordCount: z.number().describe("Count of relevant keywords found"),
      verbCount: z.number().describe("Count of strong action verbs found"),
      formatQuality: z
        .string()
        .describe("Brief assessment of formatting quality (1 sentence)"),
    })
    .describe("Objective data analysis findings"),

  keywordAnalysis: z
    .object({
      strength: z
        .string()
        .describe("Overall keyword strength assessment (1 sentence)"),
      atsScore: z
        .number()
        .min(0)
        .max(100)
        .describe("ATS-friendliness score (0-100)"),
      missingCritical: z
        .array(z.string())
        .max(5)
        .describe("Top missing critical keywords/skills"),
      recommendations: z
        .array(z.string())
        .max(3)
        .describe("Top 3 keyword optimization recommendations"),
    })
    .describe("Keyword and ATS optimization analysis"),

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
    .describe("Show your math: 'Baseline X + adj1 + adj2 - adj3 = Final Y'"),
});

// Feedback Agent Schema (combines Feedback + Synthesis)
const FeedbackAgentSchema = z.object({
  strengths: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("2-5 specific strengths with evidence from the content"),

  weaknesses: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("2-5 specific weaknesses with why they matter"),

  suggestions: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("2-5 actionable improvements with specific instructions"),

  synthesisNotes: z
    .string()
    .describe(
      "Brief notes on consistency between score and feedback (2-3 sentences)"
    ),
});

// ============================================================================
// PROMPTS
// ============================================================================

const ANALYSIS_AGENT_PROMPT = `You are an expert resume analyzer combining data analysis, keyword optimization, and fair scoring expertise.

Your role is to:
1. ANALYZE objective data (quantified achievements, keywords, verbs, formatting)
2. ASSESS keyword strength and ATS optimization
3. CALCULATE a fair final score within the allowed variance of the mathematical baseline

Key principles:
- Use the baseline score as your anchor - it's calculated from objective metrics
- Only adjust for subjective quality factors (summary clarity, experience detail, grammar)
- Your final score MUST be within the allowed variance
- Be realistic: most resumes score 45-65, exceptional ones 70-80, perfect 80+ is rare
- Provide specific evidence for all assessments`;

const FEEDBACK_AGENT_PROMPT = `You are an expert feedback specialist who transforms analysis into actionable guidance.

Your role is to:
1. IDENTIFY the top strengths with specific evidence
2. HIGHLIGHT weaknesses that matter most for job success
3. PROVIDE concrete, implementable suggestions with examples
4. SYNTHESIZE insights to ensure consistency

Key principles:
- Be specific: reference actual content, not generic observations
- Be actionable: give exact steps to improve, not vague advice
- Be encouraging: frame weaknesses as opportunities
- Be prioritized: highest-impact improvements first
- Be consistent: strengths/weaknesses should align with the score`;

// ============================================================================
// RETRY MECHANISM (same as v1)
// ============================================================================

async function runWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 1
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
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `${operationName} failed after ${maxRetries + 1} attempts: ${
      lastError.message
    }`
  );
}

// ============================================================================
// TIMEOUT WRAPPER (Phase 4: Prevent small model hangs)
// ============================================================================

const SEMANTIC_TIMEOUT_MS = 60000; // 60 seconds for semantic extraction (Ollama needs more time)
const AGENT_TIMEOUT_MS = 120000; // 120 seconds for agent calls

function isOllamaProvider(provider: ProviderType): boolean {
  return provider === "ollama";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// ============================================================================
// RESUME REVIEW (Consolidated 2-Agent System)
// ============================================================================

export async function consolidatedMultiAgentResumeReview(
  resumeText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResultV2<ResumeReviewResponse>> {
  const model = getModel(provider, modelName);

  // =========================================================================
  // STEP 1: Tool Extraction - Semantic Extraction is now the default (Phase 3)
  // =========================================================================
  progressStream?.sendStarted("tool-extraction", 0);

  // Phase 3: Semantic extraction is now the default
  // Legacy extraction only used as fallback if semantic extraction fails
  let toolData: ToolDataResume;

  try {
    // Phase 4: Wrap with timeout to prevent small model hangs
    const [semanticKeywords, semanticVerbs] = await Promise.all([
      withTimeout(
        extractSemanticKeywords(resumeText, provider, modelName),
        SEMANTIC_TIMEOUT_MS,
        "extractSemanticKeywords"
      ),
      withTimeout(
        analyzeActionVerbs(resumeText, provider, modelName),
        SEMANTIC_TIMEOUT_MS,
        "analyzeActionVerbs"
      ),
    ]);

    const quantified = countQuantifiedAchievements(resumeText);
    const formatting = analyzeFormatting(resumeText);

    toolData = {
      quantified,
      keywords: {
        keywords: [
          ...semanticKeywords.technical_skills,
          ...semanticKeywords.tools_platforms,
          ...semanticKeywords.methodologies,
        ],
        count: getKeywordCountFromSemantic(semanticKeywords),
      },
      verbs: {
        verbs: semanticVerbs.strong_verbs.map((v) => v.verb),
        count: getVerbCountFromSemantic(semanticVerbs),
      },
      formatting,
    };

    console.log("[Resume Review V2] Using semantic extraction (Phase 3)");
  } catch (error) {
    // Fallback to legacy extraction if semantic fails
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes("timed out");

    console.warn(
      "[Resume Review V2] Semantic extraction failed, using legacy fallback:",
      error
    );

    // Send user-friendly warning message
    if (progressStream) {
      const warningMsg = isTimeout
        ? `AI model is taking longer than expected. Using faster analysis method...`
        : "Advanced analysis unavailable. Using standard analysis...";
      progressStream.sendWarning("tool-extraction", warningMsg, 0);
    }

    const [quantified, keywords, verbs, formatting] = await Promise.all([
      Promise.resolve(countQuantifiedAchievements(resumeText)),
      Promise.resolve(extractKeywords(resumeText)),
      Promise.resolve(countActionVerbs(resumeText)),
      Promise.resolve(analyzeFormatting(resumeText)),
    ]);

    toolData = { quantified, keywords, verbs, formatting };
  }

  progressStream?.sendCompleted("tool-extraction", 0);

  // =========================================================================
  // STEP 2: Calculate Baseline Score
  // =========================================================================
  const baselineScore = calculateResumeScore({
    quantifiedCount: toolData.quantified.count,
    keywordCount: toolData.keywords.count,
    verbCount: toolData.verbs.count,
    hasBulletPoints: toolData.formatting.hasBulletPoints,
    sectionCount: toolData.formatting.sectionCount,
  });

  const allowedVariance = calculateAllowedVariance(
    baselineScore.score,
    "resume"
  );
  const minScore = Math.max(0, baselineScore.score - allowedVariance);
  const maxScore = Math.min(100, baselineScore.score + allowedVariance);

  console.log(
    `[Resume Review V2] Baseline: ${baselineScore.score}, Allowed variance: ±${allowedVariance} (${minScore}-${maxScore})`
  );

  // =========================================================================
  // STEP 3: PARALLEL - Analysis Agent & Feedback Agent
  // These agents can run simultaneously as they're independent
  // =========================================================================
  progressStream?.sendStarted("analysis-agent", 1);
  progressStream?.sendStarted("feedback-agent", 2);

  const isOllama = isOllamaProvider(provider);

  // Build prompts - simpler for Ollama
  const analysisPrompt = isOllama
    ? `Score this resume. Baseline: ${
        baselineScore.score
      }, range: ${minScore}-${maxScore}.

Resume:
${resumeText}

Metrics: ${toolData.quantified.count} achievements, ${
        toolData.keywords.count
      } keywords, ${toolData.verbs.count} action verbs.
Keywords found: ${toolData.keywords.keywords.slice(0, 15).join(", ")}`
    : `Analyze this resume comprehensively:

RESUME:
${resumeText}

OBJECTIVE METRICS (from tools):
- Quantified achievements: ${toolData.quantified.count} found
  Examples: ${toolData.quantified.examples.slice(0, 3).join(", ")}
- Keywords: ${toolData.keywords.count} found
  List: ${toolData.keywords.keywords.slice(0, 20).join(", ")}
- Action verbs: ${toolData.verbs.count} found
  List: ${toolData.verbs.verbs.slice(0, 15).join(", ")}
- Formatting: ${
        toolData.formatting.hasBulletPoints ? "Has bullets" : "No bullets"
      }, ${toolData.formatting.sectionCount} sections

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

BASELINE BREAKDOWN (mathematically calculated):
- Keywords: ${baselineScore.breakdown.keywords}/20 (FIXED based on count)
- Achievements: ${
        baselineScore.breakdown.achievements
      }/25 (FIXED based on count)
- Action Verbs: ${baselineScore.breakdown.verbs}/10 (FIXED based on count)
- Formatting: ${baselineScore.breakdown.formatting}/15 (FIXED based on analysis)
- Summary: ${baselineScore.breakdown.summary}/10 (adjustable based on quality)
- Experience: ${
        baselineScore.breakdown.experienceClarity
      }/10 (adjustable based on clarity)
- Skills: ${
        baselineScore.breakdown.skillsSection
      }/5 (adjustable based on organization)
- Grammar: ${baselineScore.breakdown.grammar}/5 (adjustable based on errors)

YOUR TASKS:
1. Verify/comment on the objective data analysis
2. Assess keyword strength and ATS optimization (0-100 score)
3. Identify missing critical keywords for resume improvement
4. Calculate final score by adjusting ONLY the subjective criteria (last 4)
5. Your final score MUST be between ${minScore} and ${maxScore}

IMPORTANT: The first 4 criteria are FIXED (objective counts). You can only adjust the last 4 based on resume quality.`;

  const feedbackPrompt = isOllama
    ? `Give feedback on this resume. Score: ${baselineScore.score}.

Resume:
${resumeText}

Provide strengths, weaknesses, and suggestions.`
    : `Generate actionable feedback for this resume:

RESUME:
${resumeText}

CONTEXT:
- Baseline score: ${baselineScore.score}/100 (calculated from objective metrics)
- Expected final score range: ${minScore}-${maxScore}

YOUR TASKS:
1. Identify 2-5 specific strengths with evidence from the resume
2. Identify 2-5 weaknesses that matter for job search success
3. Provide 2-5 actionable suggestions with exact implementation steps
4. Add synthesis notes on consistency between likely score and feedback

Be specific, actionable, and encouraging. Reference actual resume content.`;

  let analysisResult: AnalysisResult;
  let feedbackResult: FeedbackResult;

  try {
    [analysisResult, feedbackResult] = await Promise.all([
      // Analysis Agent with timeout
      withTimeout(
        runWithRetry(async () => {
          const { object } = await generateObject({
            model,
            schema: AnalysisAgentSchema,
            system: ANALYSIS_AGENT_PROMPT,
            prompt: analysisPrompt,
            temperature: 0.1,
          });
          return object;
        }, "Analysis Agent"),
        AGENT_TIMEOUT_MS,
        "Analysis Agent"
      ),

      // Feedback Agent with timeout
      withTimeout(
        runWithRetry(async () => {
          const { object } = await generateObject({
            model,
            schema: FeedbackAgentSchema,
            system: FEEDBACK_AGENT_PROMPT,
            prompt: feedbackPrompt,
            temperature: 0.3,
          });
          return object;
        }, "Feedback Agent"),
        AGENT_TIMEOUT_MS,
        "Feedback Agent"
      ),
    ]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes("timed out");

    console.error("[Resume Review V2] Agent execution failed:", error);

    // Send user-friendly error message
    if (progressStream) {
      const warningMsg = isTimeout
        ? "Analysis is taking too long. Please try again or use a faster model."
        : "Analysis failed. Please try again.";
      progressStream.sendWarning("analysis-agent", warningMsg, 1);
    }

    // Throw to let caller handle the error
    throw new Error(
      isTimeout
        ? "Resume review timed out. The AI model may be overloaded. Please try again."
        : `Resume review failed: ${errorMessage}`
    );
  }

  progressStream?.sendCompleted("analysis-agent", 1);
  progressStream?.sendCompleted("feedback-agent", 2);

  // =========================================================================
  // STEP 4: Validation
  // =========================================================================
  const validatedScore = validateScore(
    analysisResult.finalScore,
    baselineScore.score,
    allowedVariance
  );

  const warnings: string[] = [];
  if (validatedScore !== analysisResult.finalScore) {
    warnings.push(
      `Score adjusted from ${analysisResult.finalScore} to ${validatedScore} (outside allowed variance)`
    );
  }

  // =========================================================================
  // STEP 5: Build Final Response
  // =========================================================================
  const finalResponse: ResumeReviewResponse = {
    score: validatedScore,
    summary: `This resume scores ${validatedScore}/100, which is ${
      validatedScore >= 70
        ? "above average"
        : validatedScore >= 50
        ? "average"
        : "below average"
    }. ${feedbackResult.strengths[0] || "Multiple strengths identified."}`,
    strengths: feedbackResult.strengths,
    weaknesses: feedbackResult.weaknesses,
    suggestions: feedbackResult.suggestions,
  };

  const agentInsights: AgentInsightsV2 = {
    analysis: analysisResult,
    feedback: feedbackResult,
  };

  return {
    analysis: finalResponse,
    agentInsights,
    baselineScore,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ============================================================================
// JOB MATCH (Consolidated 2-Agent System)
// ============================================================================

export async function consolidatedMultiAgentJobMatch(
  resumeText: string,
  jobDescription: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResultV2<JobMatchResponse>> {
  const model = getModel(provider, modelName);

  // =========================================================================
  // STEP 1: Tool Extraction - Full Semantic Analysis (Phase 3)
  // =========================================================================
  progressStream?.sendStarted("tool-extraction", 0);

  // Phase 3: Full semantic matching is now the default
  // Includes semantic skill matching AND semantic similarity calculation
  let toolData: ToolDataJobMatch;
  let semanticData: {
    skillMatch: SemanticSkillMatch | null;
    similarity: SemanticSimilarityResult | null;
    matchExplanation: ReturnType<typeof generateMatchExplanation> | null;
  } = { skillMatch: null, similarity: null, matchExplanation: null };

  try {
    // Phase 4: Wrap semantic extraction with timeout to prevent small model hangs
    const [semanticMatch, semanticSimilarity] = await Promise.all([
      withTimeout(
        performSemanticSkillMatch(
          resumeText,
          jobDescription,
          provider,
          modelName
        ),
        SEMANTIC_TIMEOUT_MS,
        "performSemanticSkillMatch"
      ),
      withTimeout(
        calculateSemanticSimilarity(
          resumeText,
          jobDescription,
          provider,
          modelName
        ),
        SEMANTIC_TIMEOUT_MS,
        "calculateSemanticSimilarity"
      ),
    ]);

    // Generate comprehensive match explanation
    const matchExplanation = generateMatchExplanation(
      semanticMatch,
      semanticSimilarity
    );

    const matchedKeywords = [
      ...semanticMatch.exact_matches.map((m) => m.skill),
      ...semanticMatch.related_matches.map((m) => m.job_skill),
    ];
    const missingKeywords = semanticMatch.missing_skills.map((s) => s.skill);

    // Store semantic data for enhanced output
    semanticData = {
      skillMatch: semanticMatch,
      similarity: semanticSimilarity,
      matchExplanation,
    };

    // Use semantic similarity score instead of simple keyword overlap percentage
    toolData = {
      keywordOverlap: {
        overlapPercentage: semanticSimilarity.similarity_score, // Use semantic similarity!
        matchedKeywords,
        missingKeywords,
        totalJobKeywords: matchedKeywords.length + missingKeywords.length,
      },
      resumeKeywords: {
        keywords: matchedKeywords,
        count: matchedKeywords.length,
      },
      jobKeywords: {
        keywords: [...matchedKeywords, ...missingKeywords],
        count: matchedKeywords.length + missingKeywords.length,
      },
      requiredSkills: {
        requiredSkills: semanticMatch.missing_skills
          .filter((s) => s.importance === "critical")
          .map((s) => s.skill),
        preferredSkills: semanticMatch.missing_skills
          .filter((s) => s.importance === "important")
          .map((s) => s.skill),
        totalSkills: matchedKeywords.length + missingKeywords.length,
      },
    };

    console.log(
      "[Job Match V2] Using semantic similarity (Phase 3):",
      semanticSimilarity.similarity_score
    );
  } catch (error) {
    // Fallback to legacy extraction if semantic fails
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes("timed out");

    console.warn(
      "[Job Match V2] Semantic extraction failed, using legacy fallback:",
      error
    );

    // Send user-friendly warning message
    if (progressStream) {
      const warningMsg = isTimeout
        ? "AI model is taking longer than expected. Using faster analysis method..."
        : "Advanced analysis unavailable. Using standard matching...";
      progressStream.sendWarning("tool-extraction", warningMsg, 0);
    }

    const [resumeKeywords, jobKeywords, requiredSkills] = await Promise.all([
      Promise.resolve(extractKeywords(resumeText)),
      Promise.resolve(extractKeywords(jobDescription)),
      Promise.resolve(extractRequiredSkills(jobDescription)),
    ]);

    const keywordOverlap = calculateKeywordOverlap(resumeText, jobDescription);

    toolData = {
      keywordOverlap,
      resumeKeywords,
      jobKeywords,
      requiredSkills,
    };
  }

  progressStream?.sendCompleted("tool-extraction", 0);

  // =========================================================================
  // STEP 2: Calculate Baseline Score
  // =========================================================================
  const matchedSkillsCount = toolData.keywordOverlap.matchedKeywords.length;
  const requiredSkillsCount = Math.max(
    toolData.requiredSkills.totalSkills,
    toolData.keywordOverlap.totalJobKeywords
  );

  const baselineScore = calculateJobMatchScore({
    keywordOverlapPercent: toolData.keywordOverlap.overlapPercentage,
    matchedSkillsCount,
    requiredSkillsCount,
    experienceYears: 0, // Will be assessed by AI
    requiredYears: 0, // Will be assessed by AI
  });

  const allowedVariance = calculateAllowedVariance(
    baselineScore.score,
    "job-match"
  );
  const minScore = Math.max(0, baselineScore.score - allowedVariance);
  const maxScore = Math.min(100, baselineScore.score + allowedVariance);

  console.log(
    `[Job Match V2] Baseline: ${baselineScore.score}, Allowed variance: ±${allowedVariance} (${minScore}-${maxScore})`
  );

  // =========================================================================
  // STEP 3: PARALLEL - Analysis Agent & Feedback Agent
  // =========================================================================
  progressStream?.sendStarted("analysis-agent", 1);
  progressStream?.sendStarted("feedback-agent", 2);

  const isOllama = isOllamaProvider(provider);

  // Build prompts - simpler for Ollama
  const analysisPrompt = isOllama
    ? `Score this resume-job match. Baseline: ${
        baselineScore.score
      }, range: ${minScore}-${maxScore}.

Resume:
${resumeText}

Job:
${jobDescription}

Matched skills: ${toolData.keywordOverlap.matchedKeywords
        .slice(0, 8)
        .join(", ")}
Missing skills: ${toolData.keywordOverlap.missingKeywords
        .slice(0, 8)
        .join(", ")}`
    : `Analyze how well this resume matches the job description:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

OBJECTIVE METRICS (from tools):
- Skills matched: ${matchedSkillsCount} of ${requiredSkillsCount} (${Math.round(
        (matchedSkillsCount / Math.max(requiredSkillsCount, 1)) * 100
      )}%)
- Matched: ${toolData.keywordOverlap.matchedKeywords.slice(0, 10).join(", ")}
- Missing: ${toolData.keywordOverlap.missingKeywords.slice(0, 10).join(", ")}
- Keyword overlap: ${Math.round(toolData.keywordOverlap.overlapPercentage)}%

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

BASELINE BREAKDOWN:
- Skills: ${baselineScore.breakdown.skillsMatch}/30 (FIXED based on match ratio)
- Keywords: ${baselineScore.breakdown.keywordOverlap}/20 (FIXED based on overlap)
- Experience: ${
        baselineScore.breakdown.experienceMatch
      }/25 (adjustable - assess from text)
- Qualifications: ${baselineScore.breakdown.qualifications}/15 (adjustable)
- Industry Fit: ${baselineScore.breakdown.industryFit}/10 (adjustable)

YOUR TASKS:
1. Verify the skills and keyword matching
2. Assess experience match and quality from the texts
3. Evaluate qualifications and industry fit
4. Calculate final score (must be ${minScore}-${maxScore})

Adjust only the last 3 criteria based on your assessment.`;

  const feedbackPrompt = isOllama
    ? `Give feedback on this resume-job match. Score: ${baselineScore.score}.

Resume:
${resumeText}

Job:
${jobDescription}

Matched: ${toolData.keywordOverlap.matchedKeywords.slice(0, 5).join(", ")}
Missing: ${toolData.keywordOverlap.missingKeywords.slice(0, 5).join(", ")}`
    : `Generate match feedback comparing resume to job description:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

CONTEXT:
- Baseline score: ${baselineScore.score}/100
- Expected range: ${minScore}-${maxScore}
- Matched skills: ${toolData.keywordOverlap.matchedKeywords
        .slice(0, 5)
        .join(", ")}
- Missing skills: ${toolData.keywordOverlap.missingKeywords
        .slice(0, 5)
        .join(", ")}

YOUR TASKS:
1. Identify strengths that make this candidate a good fit
2. Identify gaps or weaknesses in the match
3. Provide specific suggestions to improve the match (keywords, skills, experience to highlight)
4. Add synthesis notes on overall fit assessment`;

  let analysisResult: AnalysisResult;
  let feedbackResult: FeedbackResult;

  try {
    [analysisResult, feedbackResult] = await Promise.all([
      // Analysis Agent with timeout
      withTimeout(
        runWithRetry(async () => {
          const { object } = await generateObject({
            model,
            schema: AnalysisAgentSchema,
            system: ANALYSIS_AGENT_PROMPT,
            prompt: analysisPrompt,
            temperature: 0.1,
          });
          return object;
        }, "Analysis Agent"),
        AGENT_TIMEOUT_MS,
        "Analysis Agent"
      ),

      // Feedback Agent with timeout
      withTimeout(
        runWithRetry(async () => {
          const { object } = await generateObject({
            model,
            schema: FeedbackAgentSchema,
            system: FEEDBACK_AGENT_PROMPT,
            prompt: feedbackPrompt,
            temperature: 0.3,
          });
          return object;
        }, "Feedback Agent"),
        AGENT_TIMEOUT_MS,
        "Feedback Agent"
      ),
    ]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes("timed out");

    console.error("[Job Match V2] Agent execution failed:", error);

    // Send user-friendly error message
    if (progressStream) {
      const warningMsg = isTimeout
        ? "Analysis is taking too long. Please try again or use a faster model."
        : "Analysis failed. Please try again.";
      progressStream.sendWarning("analysis-agent", warningMsg, 1);
    }

    // Throw to let caller handle the error
    throw new Error(
      isTimeout
        ? "Job match analysis timed out. The AI model may be overloaded. Please try again."
        : `Job match analysis failed: ${errorMessage}`
    );
  }

  progressStream?.sendCompleted("analysis-agent", 1);
  progressStream?.sendCompleted("feedback-agent", 2);

  // =========================================================================
  // STEP 4: Validation
  // =========================================================================
  const validatedScore = validateScore(
    analysisResult.finalScore,
    baselineScore.score,
    allowedVariance
  );

  const warnings: string[] = [];
  if (validatedScore !== analysisResult.finalScore) {
    warnings.push(
      `Score adjusted from ${analysisResult.finalScore} to ${validatedScore}`
    );
  }

  // =========================================================================
  // STEP 5: Build Final Response (Enhanced with Phase 3 Semantic Data)
  // =========================================================================

  // Build enhanced detailed analysis using semantic data when available
  const detailedAnalysis = [];

  // Skills Match - use semantic skill match data if available
  if (semanticData.skillMatch) {
    const exactCount = semanticData.skillMatch.exact_matches.length;
    const relatedCount = semanticData.skillMatch.related_matches.length;
    const missingCount = semanticData.skillMatch.missing_skills.length;

    detailedAnalysis.push({
      category: `Skills Match (${baselineScore.breakdown.skillsMatch}/30 pts)`,
      value: [
        `${exactCount} exact matches, ${relatedCount} transferable skills, ${missingCount} gaps`,
        ...semanticData.skillMatch.exact_matches
          .slice(0, 3)
          .map(
            (m) => `✅ ${m.skill}: "${m.resume_evidence.substring(0, 40)}..."`
          ),
        ...semanticData.skillMatch.related_matches
          .slice(0, 2)
          .map(
            (m) =>
              `⚡ ${m.resume_skill} → ${m.job_skill} (${m.similarity}% similar)`
          ),
        ...semanticData.skillMatch.missing_skills
          .filter((s) => s.importance === "critical")
          .slice(0, 2)
          .map((s) => `❌ ${s.skill} (critical, ${s.learnability} to learn)`),
      ],
    });
  } else {
    detailedAnalysis.push({
      category: `Skills Match (${baselineScore.breakdown.skillsMatch}/30 pts)`,
      value: [
        `Matched ${matchedSkillsCount} of ${requiredSkillsCount} required skills`,
        ...toolData.keywordOverlap.matchedKeywords
          .slice(0, 5)
          .map((k) => `✅ ${k}`),
        ...toolData.keywordOverlap.missingKeywords
          .slice(0, 3)
          .map((k) => `❌ ${k}`),
      ],
    });
  }

  // Semantic Similarity - Phase 3 replacement for keyword overlap
  if (semanticData.similarity) {
    detailedAnalysis.push({
      category: `Semantic Fit (${baselineScore.breakdown.keywordOverlap}/20 pts)`,
      value: [
        `${Math.round(
          semanticData.similarity.similarity_score
        )}% semantic match`,
        semanticData.similarity.match_explanation,
        ...semanticData.similarity.key_matches.slice(0, 2),
      ],
    });
  } else {
    detailedAnalysis.push({
      category: `Keyword Overlap (${baselineScore.breakdown.keywordOverlap}/20 pts)`,
      value: [
        `${Math.round(
          toolData.keywordOverlap.overlapPercentage
        )}% keyword match`,
        analysisResult.keywordAnalysis.strength,
      ],
    });
  }

  // Transferable Skills (Phase 3 - new section)
  if (
    semanticData.similarity &&
    semanticData.similarity.transferable_skills.length > 0
  ) {
    detailedAnalysis.push({
      category: "Transferable Skills",
      value: semanticData.similarity.transferable_skills
        .slice(0, 3)
        .map(
          (s) => `💡 ${s.resume_skill} → ${s.job_skill}: ${s.how_it_transfers}`
        ),
    });
  }

  // Overall Assessment
  detailedAnalysis.push({
    category: "Overall Assessment",
    value: [
      semanticData.matchExplanation?.fit_assessment ||
        feedbackResult.synthesisNotes,
    ],
  });

  // Build suggestions using semantic data
  const suggestions = [];

  // Action items from semantic analysis
  if (
    semanticData.matchExplanation &&
    semanticData.matchExplanation.action_items.length > 0
  ) {
    suggestions.push({
      category: "Priority Actions",
      value: semanticData.matchExplanation.action_items.slice(0, 4),
    });
  }

  // Keywords to add
  suggestions.push({
    category: "Skills to Add",
    value: analysisResult.keywordAnalysis.missingCritical.slice(0, 4),
  });

  // Top improvements
  suggestions.push({
    category: "Top Improvements",
    value: feedbackResult.suggestions.slice(0, 4),
  });

  // Build additional comments with semantic recommendation
  const recommendation =
    semanticData.similarity?.application_recommendation ||
    (validatedScore >= 70
      ? "Apply now - strong match"
      : validatedScore >= 50
      ? "Apply after addressing key gaps"
      : "Consider upskilling before applying");

  const finalResponse: JobMatchResponse = {
    matching_score: validatedScore,
    detailed_analysis: detailedAnalysis,
    suggestions,
    additional_comments: [
      `Score: ${validatedScore}/100 - ${
        validatedScore >= 70
          ? "Strong"
          : validatedScore >= 50
          ? "Moderate"
          : "Weak"
      } match`,
      semanticData.similarity?.match_explanation ||
        feedbackResult.synthesisNotes,
      `Recommendation: ${recommendation}`,
    ],
  };

  const agentInsights: AgentInsightsV2 = {
    analysis: analysisResult,
    feedback: feedbackResult,
  };

  return {
    analysis: finalResponse,
    agentInsights,
    baselineScore,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
