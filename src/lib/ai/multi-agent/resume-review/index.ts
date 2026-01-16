/**
 * Multi-Agent Resume Review
 *
 * Handles resume analysis using the multi-agent collaboration system.
 */

import { getModel, ProviderType } from "../../providers";
import { AnalysisAgentSchema, FeedbackAgentSchema } from "@/models/ai.schemas";
import {
  ANALYSIS_AGENT_PROMPT,
  FEEDBACK_AGENT_PROMPT,
} from "../../prompts/resume-review";
import {
  countQuantifiedAchievements,
  analyzeFormatting,
  extractSemanticKeywords,
  analyzeActionVerbs,
  getKeywordCountFromSemantic,
  getVerbCountFromSemantic,
} from "../../tools";
import { ProgressStream } from "../../progress-stream";
import {
  calculateResumeScore,
  validateScore,
  calculateAllowedVariance,
} from "../../scoring";
import {
  ResumeReviewResponse,
  AgentInsights,
  CollaborativeResult,
  ToolDataResume,
} from "@/models/ai.model";
import { TEMPERATURES } from "../../config";
import {
  isOllamaProvider,
  SEMANTIC_TIMEOUT_MS,
  OllamaAnalysisAgentSchema,
  OllamaFeedbackAgentSchema,
  OLLAMA_ANALYSIS_SYSTEM_PROMPT,
  OLLAMA_FEEDBACK_SYSTEM_PROMPT,
  buildOllamaResumeAnalysisPrompt,
  buildOllamaResumeFeedbackPrompt,
} from "../../ollama";
import { withTimeout } from "../utils";
import {
  executeAgents,
  handleExtractionError,
  handleAgentError,
} from "../shared";
import { buildResumeReviewResponse } from "./response-builder";

// RESUME REVIEW

export async function multiAgentResumeReview(
  resumeText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResult<ResumeReviewResponse>> {
  const model = getModel(provider, modelName);

  // STEP 1: Tool Extraction -

  progressStream?.sendStarted("tool-extraction", 0);

  let toolData: ToolDataResume;

  try {
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

    console.log("[Resume Review] Using semantic extraction (Phase 3)");
  } catch (error) {
    handleExtractionError(error, progressStream, "resume analysis");
  }

  progressStream?.sendCompleted("tool-extraction", 0);

  // STEP 2: Calculate Baseline Score

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
    `[Resume Review] Baseline: ${baselineScore.score}, Allowed variance: ±${allowedVariance} (${minScore}-${maxScore})`
  );

  // STEP 3: PARALLEL - Analysis Agent & Feedback Agent

  progressStream?.sendStarted("analysis-agent", 1);
  progressStream?.sendStarted("feedback-agent", 2);

  const isOllama = isOllamaProvider(provider);

  const analysisPrompt = isOllama
    ? buildOllamaResumeAnalysisPrompt(
        resumeText,
        toolData,
        baselineScore,
        minScore,
        maxScore
      )
    : buildFullResumeAnalysisPrompt(
        resumeText,
        toolData,
        baselineScore,
        minScore,
        maxScore
      );

  const feedbackPrompt = isOllama
    ? buildOllamaResumeFeedbackPrompt(resumeText, baselineScore)
    : buildFullResumeFeedbackPrompt(
        resumeText,
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
          ? OLLAMA_ANALYSIS_SYSTEM_PROMPT
          : ANALYSIS_AGENT_PROMPT,
        prompt: analysisPrompt,
        temperature: TEMPERATURES.ANALYSIS,
      },
      feedback: {
        schema: isOllama ? OllamaFeedbackAgentSchema : FeedbackAgentSchema,
        systemPrompt: isOllama
          ? OLLAMA_FEEDBACK_SYSTEM_PROMPT
          : FEEDBACK_AGENT_PROMPT,
        prompt: feedbackPrompt,
        temperature: TEMPERATURES.FEEDBACK,
      },
      verbCount: toolData.verbs.count,
    });

    analysisResult = result.analysisResult;
    feedbackResult = result.feedbackResult;
  } catch (error) {
    handleAgentError(error, progressStream, "resume analysis");
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
      `Score adjusted from ${analysisResult.finalScore} to ${validatedScore} (outside allowed variance)`
    );
  }

  // STEP 5: Build Final Response

  const finalResponse = buildResumeReviewResponse(
    validatedScore,
    feedbackResult
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

function buildFullResumeAnalysisPrompt(
  resumeText: string,
  toolData: ToolDataResume,
  baselineScore: { score: number; breakdown: Record<string, number> },
  minScore: number,
  maxScore: number
): string {
  return `Analyze this resume comprehensively:

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
}

function buildFullResumeFeedbackPrompt(
  resumeText: string,
  baselineScore: { score: number; breakdown: Record<string, number> },
  minScore: number,
  maxScore: number
): string {
  return `Generate actionable feedback for this resume:

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
}
