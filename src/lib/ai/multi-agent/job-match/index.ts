/**
 * Multi-Agent Job Match
 *
 * Handles job matching analysis using the multi-agent collaboration system.
 */

import { getModel, ProviderType } from "../../providers";
import { AnalysisAgentSchema, FeedbackAgentSchema } from "@/models/ai.schemas";
import {
  ANALYSIS_AGENT_PROMPT,
  FEEDBACK_AGENT_PROMPT,
} from "../../prompts/prompts.agents";

import {
  performSemanticSkillMatch,
  calculateSemanticSimilarity,
  generateMatchExplanation,
} from "../../tools";
import { ProgressStream } from "../../progress-stream";
import {
  calculateJobMatchScore,
  validateScore,
  calculateAllowedVariance,
} from "../../scoring";
import {
  JobMatchResponse,
  AgentInsights,
  CollaborativeResult,
  ToolDataJobMatch,
  SemanticData,
} from "@/models/ai.model";
import {
  isOllamaProvider,
  SEMANTIC_TIMEOUT_MS,
  OllamaAnalysisAgentSchema,
  OllamaFeedbackAgentSchema,
  OLLAMA_JOB_MATCH_ANALYSIS_SYSTEM_PROMPT,
  OLLAMA_JOB_MATCH_FEEDBACK_SYSTEM_PROMPT,
  buildOllamaJobMatchAnalysisPrompt,
  buildOllamaJobMatchFeedbackPrompt,
} from "../../ollama";
import { withTimeout } from "../utils";
import {
  executeAgents,
  handleExtractionError,
  handleAgentError,
} from "../shared";
import { buildJobMatchResponse } from "./response-builder";

// JOB MATCH

export async function multiAgentJobMatch(
  resumeText: string,
  jobDescription: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResult<JobMatchResponse>> {
  const model = getModel(provider, modelName);

  // STEP 1: Tool Extraction - Full Semantic Analysis

  progressStream?.sendStarted("tool-extraction", 0);

  let toolData: ToolDataJobMatch;
  let semanticData: SemanticData = {
    skillMatch: null,
    similarity: null,
    matchExplanation: null,
  };

  try {
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

    const matchExplanation = generateMatchExplanation(
      semanticMatch,
      semanticSimilarity
    );

    const matchedKeywords = [
      ...semanticMatch.exact_matches.map((m) => m.skill),
      ...semanticMatch.related_matches.map((m) => m.job_skill),
    ];
    const missingKeywords = semanticMatch.missing_skills.map((s) => s.skill);

    semanticData = {
      skillMatch: semanticMatch,
      similarity: semanticSimilarity,
      matchExplanation,
    };

    toolData = {
      keywordOverlap: {
        overlapPercentage: semanticSimilarity.similarity_score,
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
      "[Job Match] Using semantic similarity (Phase 3):",
      semanticSimilarity.similarity_score
    );
  } catch (error) {
    handleExtractionError(error, progressStream, "job matching");
  }

  progressStream?.sendCompleted("tool-extraction", 0);

  // STEP 2: Calculate Baseline Score

  const matchedSkillsCount = toolData.keywordOverlap.matchedKeywords.length;
  const requiredSkillsCount = Math.max(
    toolData.requiredSkills.totalSkills,
    toolData.keywordOverlap.totalJobKeywords
  );

  const baselineScore = calculateJobMatchScore({
    keywordOverlapPercent: toolData.keywordOverlap.overlapPercentage,
    matchedSkillsCount,
    requiredSkillsCount,
    experienceYears: 0,
    requiredYears: 0,
  });

  const allowedVariance = calculateAllowedVariance(
    baselineScore.score,
    "job-match"
  );
  const minScore = Math.max(0, baselineScore.score - allowedVariance);
  const maxScore = Math.min(100, baselineScore.score + allowedVariance);

  console.log(
    `[Job Match] Baseline: ${baselineScore.score}, Allowed variance: ±${allowedVariance} (${minScore}-${maxScore})`
  );

  // STEP 3: PARALLEL - Analysis Agent & Feedback Agent

  progressStream?.sendStarted("analysis-agent", 1);
  progressStream?.sendStarted("feedback-agent", 2);

  const isOllama = isOllamaProvider(provider);

  const analysisPrompt = isOllama
    ? buildOllamaJobMatchAnalysisPrompt(
        resumeText,
        jobDescription,
        toolData,
        baselineScore,
        minScore,
        maxScore
      )
    : buildFullJobMatchAnalysisPrompt(
        resumeText,
        jobDescription,
        toolData,
        baselineScore,
        matchedSkillsCount,
        requiredSkillsCount,
        minScore,
        maxScore
      );

  const feedbackPrompt = isOllama
    ? buildOllamaJobMatchFeedbackPrompt(
        resumeText,
        jobDescription,
        toolData,
        baselineScore
      )
    : buildFullJobMatchFeedbackPrompt(
        resumeText,
        jobDescription,
        toolData,
        baselineScore,
        minScore,
        maxScore
      );

  let analysisResult;
  let feedbackResult;

  try {
    const result = await executeAgents({
      model,
      provider,
      analysis: {
        schema: isOllama ? OllamaAnalysisAgentSchema : AnalysisAgentSchema,
        systemPrompt: isOllama
          ? OLLAMA_JOB_MATCH_ANALYSIS_SYSTEM_PROMPT
          : ANALYSIS_AGENT_PROMPT,
        prompt: analysisPrompt,
        temperature: 0.1,
      },
      feedback: {
        schema: isOllama ? OllamaFeedbackAgentSchema : FeedbackAgentSchema,
        systemPrompt: isOllama
          ? OLLAMA_JOB_MATCH_FEEDBACK_SYSTEM_PROMPT
          : FEEDBACK_AGENT_PROMPT,
        prompt: feedbackPrompt,
        temperature: 0.3,
      },
    });

    analysisResult = result.analysisResult;
    feedbackResult = result.feedbackResult;
  } catch (error) {
    handleAgentError(error, progressStream, "job matching");
  }

  progressStream?.sendCompleted("analysis-agent", 1);
  progressStream?.sendCompleted("feedback-agent", 2);

  // STEP 4: Validation

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

  // STEP 5: Build Final Response

  const finalResponse = buildJobMatchResponse(
    validatedScore,
    baselineScore,
    toolData,
    semanticData,
    analysisResult,
    feedbackResult,
    matchedSkillsCount,
    requiredSkillsCount
  );

  const agentInsights: AgentInsights = {
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

// PROMPT BUILDERS

function buildFullJobMatchAnalysisPrompt(
  resumeText: string,
  jobDescription: string,
  toolData: ToolDataJobMatch,
  baselineScore: { score: number; breakdown: Record<string, number> },
  matchedSkillsCount: number,
  requiredSkillsCount: number,
  minScore: number,
  maxScore: number
): string {
  return `Analyze how well this resume matches the job description:

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
- Keywords: ${
    baselineScore.breakdown.keywordOverlap
  }/20 (FIXED based on overlap)
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
}

function buildFullJobMatchFeedbackPrompt(
  resumeText: string,
  jobDescription: string,
  toolData: ToolDataJobMatch,
  baselineScore: { score: number; breakdown: Record<string, number> },
  minScore: number,
  maxScore: number
): string {
  return `Generate match feedback comparing resume to job description:

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
}
