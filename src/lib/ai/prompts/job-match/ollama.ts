/**
 * Job Match Ollama Prompts
 *
 * Simplified prompts optimized for small local models like llama3.2.
 */

import type { ToolDataJobMatch } from "@/models/ai.model";
import type { BaselineScore } from "../../scoring";

export const OLLAMA_JOB_MATCH_ANALYSIS_SYSTEM_PROMPT =
  "You are a job match analyzer. Score how well the resume matches the job.";

export const OLLAMA_JOB_MATCH_FEEDBACK_SYSTEM_PROMPT =
  "You are a job match expert. Provide strengths, gaps, and suggestions.";

/**
 * Build job match analysis prompt for Ollama
 */
export function buildOllamaJobMatchAnalysisPrompt(
  resumeText: string,
  jobDescription: string,
  toolData: ToolDataJobMatch,
  baselineScore: BaselineScore,
  minScore: number,
  maxScore: number
): string {
  return `Score this resume-job match. Baseline: ${baselineScore.score}, range: ${minScore}-${maxScore}.

Resume:
${resumeText}

Job:
${jobDescription}

Matched skills: ${toolData.keywordOverlap.matchedKeywords.slice(0, 8).join(", ")}
Missing skills: ${toolData.keywordOverlap.missingKeywords.slice(0, 8).join(", ")}`;
}

/**
 * Build job match feedback prompt for Ollama
 */
export function buildOllamaJobMatchFeedbackPrompt(
  resumeText: string,
  jobDescription: string,
  toolData: ToolDataJobMatch,
  baselineScore: BaselineScore
): string {
  return `Give feedback on this resume-job match. Score: ${baselineScore.score}.

Resume:
${resumeText}

Job:
${jobDescription}

Matched: ${toolData.keywordOverlap.matchedKeywords.slice(0, 5).join(", ")}
Missing: ${toolData.keywordOverlap.missingKeywords.slice(0, 5).join(", ")}`;
}
