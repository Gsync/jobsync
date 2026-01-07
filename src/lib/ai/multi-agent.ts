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
  maxRetries: number = 1  // Reduced from 2 for faster failure (max 3s overhead vs 7s)
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

// ============================================================================
// TIMEOUT WRAPPER WITH ABORT CONTROLLER
// ============================================================================

function createAbortableTimeout(timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

// ============================================================================
// TOKEN ESTIMATION (rough approximation: ~4 chars per token)
// ============================================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function logContextSize(agentName: string, systemPrompt: string, userPrompt: string): number {
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userPrompt);
  const totalTokens = systemTokens + userTokens;
  console.log(`[${agentName}] Context size: ~${totalTokens} tokens (system: ${systemTokens}, user: ${userTokens})`);
  return totalTokens;
}

// ============================================================================
// TEXT COMPACTION (removes redundancy while preserving key info)
// ============================================================================

function compactAgentOutput(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    // Remove markdown formatting but keep structure
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    // Remove redundant phrases
    .replace(/^[-•]\s*/gm, '- ')
    .replace(/\n- \n/g, '\n')
    // Compact lists
    .replace(/:\n- /g, ': ')
    .trim();
}

// ============================================================================
// FALLBACK RESPONSE BUILDERS
// ============================================================================

function buildFallbackJobMatchResponse(
  scoringResult: ScoringResult,
  toolData: ToolDataJobMatch,
  feedbackAnalysis: string
): JobMatchResponse {
  // Extract suggestions from feedback analysis text
  const suggestionMatches = feedbackAnalysis.match(/\d+\.\s+\*\*[^*]+\*\*[^]*?(?=\d+\.\s+\*\*|$)/g) || [];
  const suggestions = suggestionMatches.slice(0, 3).map((match, i) => {
    const titleMatch = match.match(/\*\*([^*]+)\*\*/);
    return {
      category: titleMatch ? titleMatch[1].trim() : `Suggestion ${i + 1}`,
      value: match.replace(/\*\*[^*]+\*\*/, "").trim().split("\n").filter(Boolean).slice(0, 4),
    };
  });

  // Build default suggestions if none extracted
  if (suggestions.length < 2) {
    suggestions.push(
      {
        category: "Keywords to Add",
        value: toolData.keywordOverlap.missingKeywords.slice(0, 4).map(k => `Add "${k}" to your resume`),
      },
      {
        category: "Skills to Highlight",
        value: toolData.keywordOverlap.matchedKeywords.slice(0, 4).map(k => `Emphasize your ${k} experience`),
      }
    );
  }

  return {
    matching_score: scoringResult.finalScore,
    detailed_analysis: [
      {
        category: `Skills Match (${Math.round(toolData.keywordOverlap.matchedKeywords.length / Math.max(toolData.keywordOverlap.totalJobKeywords, 1) * 30)}/30 pts)`,
        value: [
          `Matched ${toolData.keywordOverlap.matchedKeywords.length} of ${toolData.keywordOverlap.totalJobKeywords} required skills`,
          ...toolData.keywordOverlap.matchedKeywords.slice(0, 3).map(k => `✅ ${k}`),
          ...toolData.keywordOverlap.missingKeywords.slice(0, 2).map(k => `❌ Missing: ${k}`),
        ],
      },
      {
        category: `Keyword Overlap (${Math.round(toolData.keywordOverlap.overlapPercentage * 0.2)}/20 pts)`,
        value: [
          `${Math.round(toolData.keywordOverlap.overlapPercentage)}% keyword overlap detected`,
          `Found: ${toolData.keywordOverlap.matchedKeywords.slice(0, 5).join(", ") || "None"}`,
          `Missing: ${toolData.keywordOverlap.missingKeywords.slice(0, 5).join(", ") || "None"}`,
        ],
      },
      {
        category: "Experience Assessment",
        value: [
          `Resume contains ${toolData.resumeKeywords.count} technical keywords`,
          `Job requires ${toolData.jobKeywords.count} technical keywords`,
          scoringResult.adjustments.find(a => a.criterion.toLowerCase().includes("experience"))?.reason || "Experience level assessed",
        ],
      },
    ],
    suggestions: suggestions.slice(0, 3),
    additional_comments: [
      `Match score: ${scoringResult.finalScore}/100 - ${scoringResult.finalScore >= 65 ? "Strong match" : scoringResult.finalScore >= 50 ? "Moderate match" : "Consider improvements"}`,
      `Priority: ${toolData.keywordOverlap.missingKeywords[0] ? `Add ${toolData.keywordOverlap.missingKeywords[0]} to your resume` : "Highlight your matched skills"}`,
      `Recommendation: ${scoringResult.finalScore >= 65 ? "Apply with confidence" : scoringResult.finalScore >= 50 ? "Apply after tailoring resume" : "Consider upskilling first"}`,
    ],
  };
}

function buildFallbackResumeReviewResponse(
  scoringResult: ScoringResult,
  toolData: ToolDataResume,
  feedbackAnalysis: string
): ResumeReviewResponse {
  // Extract strengths/weaknesses from feedback analysis
  const extractPoints = (section: string): string[] => {
    const regex = new RegExp(`${section}[\\s\\S]*?(?=###|$)`, "i");
    const match = feedbackAnalysis.match(regex);
    if (!match) return [];
    return match[0]
      .split("\n")
      .filter(line => line.match(/^\d+\.|^-|^\*/))
      .slice(0, 4)
      .map(line => line.replace(/^[\d\.\-\*\s]+/, "").trim());
  };

  const strengths = extractPoints("STRENGTHS");
  const weaknesses = extractPoints("WEAKNESSES");
  const suggestions = extractPoints("SUGGESTIONS");

  return {
    score: scoringResult.finalScore,
    summary: `Your resume scores ${scoringResult.finalScore}/100. ${toolData.quantified.count > 0 ? `Contains ${toolData.quantified.count} quantified achievements. ` : ""}${toolData.keywords.count} technical keywords detected.`,
    strengths: strengths.length > 0 ? strengths : [
      toolData.quantified.count > 3 ? "Good use of quantified achievements" : "Resume structure is clear",
      `Contains ${toolData.keywords.count} technical keywords`,
      toolData.formatting.hasBulletPoints ? "Uses bullet points effectively" : "Organized layout",
    ],
    weaknesses: weaknesses.length > 0 ? weaknesses : [
      toolData.quantified.count < 3 ? "Could use more quantified achievements" : "Some sections could be more concise",
      toolData.verbs.count < 10 ? "Consider using more strong action verbs" : "Minor formatting improvements possible",
    ],
    suggestions: suggestions.length > 0 ? suggestions : [
      toolData.quantified.count < 5 ? "Add more metrics and numbers to demonstrate impact" : "Continue emphasizing measurable achievements",
      "Tailor keywords to specific job descriptions",
      "Ensure consistent formatting throughout",
    ],
  };
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
const DATA_ANALYZER_PROMPT = `Extract ONLY objective, countable facts. No opinions or interpretations.

## RESUME ANALYSIS - Extract:

1. QUANTIFIED ACHIEVEMENTS (%, $, numbers, time savings, growth)
   Format: "Found [X] quantified achievements: [quote each]"

2. TECHNICAL KEYWORDS (technologies, tools, methodologies, certs)
   Format: "Found [X] keywords: [list]"

3. ACTION VERBS
   Strong: Led, Architected, Delivered, Spearheaded, Optimized, Built
   Weak: Responsible for, Helped, Assisted, Worked on
   Format: "[X] strong, [Y] weak verbs"

4. STRUCTURE: sections count, bullet points (yes/no), summary (yes/no), positions count

## JOB MATCH ANALYSIS - Extract:

1. REQUIREMENTS: required skills, preferred skills, years needed, education, certs

2. MATCH CHECKLIST: For each requirement → Found/Missing with evidence quote

3. KEYWORD OVERLAP: job keywords, resume keywords, missing, overlap %

RULES: COUNT don't estimate. QUOTE don't paraphrase. FACTS not opinions.`;

/**
 * AGENT 2: Keyword Expert Agent
 * Specializes in ATS optimization and keyword strategy
 */
const KEYWORD_EXPERT_PROMPT = `You are an ATS optimization expert. Analyze keyword quality and ATS compatibility.

## ATS SCORING
- Exact Match: 100% | Synonym: 70-90% | Partial: 30-50% | Missing: 0%

## KEYWORD TIERS
- Tier 1 (Critical): Job title/first paragraph skills
- Tier 2 (Important): Requirements section
- Tier 3 (Nice-to-have): Preferred/bonus section

## ATS-HOSTILE PATTERNS (flag these)
- Skills in paragraphs not skills section
- Missing acronym OR full name (need both)
- Creative titles ATS won't recognize

## SCORING SCALE (0-20 points)
18-20: Comprehensive, well-placed | 14-17: Good, minor gaps | 10-13: Adequate, missing terms | 5-9: Significant gaps | 0-4: Critical deficiency

## OUTPUT FORMAT
**Keyword Count:** X found
**Keyword Strength:** X/20
**Tier 1:** ✅ Found: [list] | ❌ Missing: [list]
**Tier 2:** ✅ Found: [list] | ❌ Missing: [list]
**ATS Issues:** [list problems]
**Recommendations:** [specific keywords to add with placement]`;

/**
 * AGENT 3: Scoring Specialist Agent
 * Specializes in fair, calibrated scoring
 */
const SCORING_SPECIALIST_PROMPT = `Calculate fair, defensible scores by combining objective metrics with limited subjective adjustments.

## RULES
1. BASELINE IS FIXED - calculated from objective counts (keywords, achievements, verbs, formatting)
2. ADJUSTABLE CRITERIA ONLY: Summary (0-10), Experience Clarity (0-10), Skills Section (0-5), Grammar (0-5)
3. MAX ADJUSTMENT: ±10 points from baseline total

## CAREER STAGE EXPECTATIONS
Entry: 35-50 | Mid: 45-65 | Senior: 55-75 | Exceptional: >80 (rare)

## SCORING GUIDELINES
${SCORING_GUIDELINES.resume.excellent}
${SCORING_GUIDELINES.resume.good}
${SCORING_GUIDELINES.resume.average}

## OUTPUT FORMAT
**Baseline:** X/100
**Adjustments:** criterion → adjustment (reason)
**Math:** Baseline X + adj1 + adj2 = Final Y
**Final Score:** Y/100`;

/**
 * AGENT 4: Feedback Specialist Agent
 * Specializes in actionable, constructive feedback
 */
const FEEDBACK_SPECIALIST_PROMPT = `Transform analysis into actionable feedback. Be specific, evidence-based, and prioritized.

## STRENGTHS FORMAT (3-5)
- Name the strength category
- Quote exact text from resume
- Explain why it works

## WEAKNESSES FORMAT (3-5)
- Name the gap
- Quote/describe the issue
- Explain impact (recruiter/ATS perspective)

## SUGGESTIONS FORMAT (3-5, prioritized)
- Start with action verb (Add, Replace, Move, Quantify)
- Specify exact target (which bullet/section)
- Give specific solution with before/after example

## PRIORITY LEVELS
HIGH: Quantified achievements, professional summary, critical keywords
MEDIUM: Action verbs, skills organization, formatting
LOW: Word choice, soft skills, visual polish

## OUTPUT
### STRENGTHS: [Category]: "[quote]" - [why it works]
### WEAKNESSES: [Category]: "[issue]" - [why it matters]
### SUGGESTIONS: [HIGH/MED] [Action]: [specific fix with example]
### OVERALL: [Single most important thing to fix]`;

/**
 * AGENT 5: Synthesis Coordinator Agent
 * Combines insights from all agents into coherent output
 */
const SYNTHESIS_COORDINATOR_PROMPT = `Combine agent outputs into final user-facing response.

## CRITICAL RULES
1. USE EXACT SCORE from Scoring Specialist - DO NOT recalculate
2. Select 3-5 best strengths, weaknesses, suggestions from Feedback Specialist
3. Ensure summary sentiment matches score

## OUTPUT REQUIREMENTS
**Summary:** 2-3 sentences with exact score, top strength, key improvement area
**Strengths:** Specific with evidence, not generic
**Weaknesses:** Specific and fixable, explain impact
**Suggestions:** Actionable with examples, prioritized

## QUALITY CHECK
□ Score matches Scoring Specialist exactly
□ All items reference specific resume content
□ No contradictions between score and feedback
□ Nothing generic - everything specific to THIS resume`;

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
  // SEQUENTIAL: Synthesis Coordinator (with timeout and fallback)
  // =========================================================================
  progressStream?.sendStarted("synthesis-coordinator", 5);

  let finalOutput: ResumeReviewResponse;
  let usedFallback = false;

  // Compact agent outputs to reduce token count while preserving key info
  const compactedDataAnalysis = compactAgentOutput(dataAnalysis);
  const compactedKeywordAnalysis = compactAgentOutput(keywordAnalysis);
  const compactedFeedbackAnalysis = compactAgentOutput(feedbackAnalysis);

  const synthesisPrompt = `Synthesize the team's analysis into the final structured output:

DATA ANALYZER:
${compactedDataAnalysis}

KEYWORD EXPERT:
${compactedKeywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${JSON.stringify(scoringResult.adjustments, null, 2)}

FEEDBACK SPECIALIST:
${compactedFeedbackAnalysis}

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

Ensure everything is consistent, specific, and actionable.`;

  logContextSize("Resume Review Synthesis", SYNTHESIS_COORDINATOR_PROMPT, synthesisPrompt);

  // DeepSeek has issues with generateObject JSON schema mode - use fallback directly
  if (provider === "deepseek") {
    console.log("[Resume Review Synthesis] Using fallback for DeepSeek (JSON schema compatibility issue)");
    finalOutput = buildFallbackResumeReviewResponse(scoringResult, toolData, feedbackAnalysis);
    usedFallback = true;
  } else {
    // Create abort controller for 45 second timeout
    const { signal, cleanup } = createAbortableTimeout(30000);  // Reduced from 45s for faster fallback

    try {
      const { object } = await generateObject({
        model,
        schema: ResumeReviewSchema,
        system: SYNTHESIS_COORDINATOR_PROMPT,
        prompt: synthesisPrompt,
        temperature: 0.1,
        abortSignal: signal,
      });
      cleanup();
      finalOutput = object;
    } catch (error) {
      cleanup();
      const isAborted = error instanceof Error && error.name === 'AbortError';
      console.warn(`Synthesis Coordinator ${isAborted ? 'timed out (30s)' : 'failed'}, using fallback:`,
        isAborted ? 'timeout' : error);
      finalOutput = buildFallbackResumeReviewResponse(scoringResult, toolData, feedbackAnalysis);
      usedFallback = true;
    }
  }

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
    warnings: usedFallback ? ["Synthesis timed out - using simplified response"] : undefined,
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
  // SEQUENTIAL: Synthesis Coordinator (with timeout and fallback)
  // =========================================================================
  progressStream?.sendStarted("synthesis-coordinator", 5);

  let finalOutput: JobMatchResponse;
  let usedFallback = false;

  // Compact agent outputs to reduce token count while preserving key info
  const compactedDataAnalysis = compactAgentOutput(dataAnalysis);
  const compactedKeywordAnalysis = compactAgentOutput(keywordAnalysis);
  const compactedFeedbackAnalysis = compactAgentOutput(feedbackAnalysis);

  const synthesisPrompt = `Synthesize the team's job match analysis:

DATA ANALYZER:
${compactedDataAnalysis}

KEYWORD EXPERT:
${compactedKeywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${JSON.stringify(scoringResult.adjustments, null, 2)}

FEEDBACK SPECIALIST:
${compactedFeedbackAnalysis}

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
Each suggestion should be concrete and actionable.`;

  logContextSize("Job Match Synthesis", SYNTHESIS_COORDINATOR_PROMPT, synthesisPrompt);

  // DeepSeek has issues with generateObject JSON schema mode - use fallback directly
  if (provider === "deepseek") {
    console.log("[Job Match Synthesis] Using fallback for DeepSeek (JSON schema compatibility issue)");
    finalOutput = buildFallbackJobMatchResponse(scoringResult, toolData, feedbackAnalysis);
    usedFallback = true;
  } else {
    // Create abort controller for 45 second timeout
    const { signal, cleanup } = createAbortableTimeout(30000);  // Reduced from 45s for faster fallback

    try {
      const { object } = await generateObject({
        model,
        schema: JobMatchSchema,
        system: SYNTHESIS_COORDINATOR_PROMPT,
        prompt: synthesisPrompt,
        temperature: 0.1,
        abortSignal: signal,
      });
      cleanup();
      finalOutput = object;
    } catch (error) {
      cleanup();
      const isAborted = error instanceof Error && error.name === 'AbortError';
      console.warn(`Synthesis Coordinator ${isAborted ? 'timed out (30s)' : 'failed'}, using fallback:`,
        isAborted ? 'timeout' : error);
      finalOutput = buildFallbackJobMatchResponse(scoringResult, toolData, feedbackAnalysis);
      usedFallback = true;
    }
  }

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
    warnings: usedFallback ? ["Synthesis timed out - using simplified response"] : undefined,
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
