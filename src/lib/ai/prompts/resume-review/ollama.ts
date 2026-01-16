/**
 * Resume Review Ollama Prompts
 *
 * Simplified prompts optimized for small local models like llama3.2.
 */

import type { ToolDataResume } from "@/models/ai.model";
import type { BaselineScore } from "../../scoring";

export const OLLAMA_ANALYSIS_SYSTEM_PROMPT =
  "You are a resume analyzer. Analyze the resume and provide a score with explanation.";

export const OLLAMA_FEEDBACK_SYSTEM_PROMPT =
  "You are a resume feedback expert. Provide strengths, weaknesses, and suggestions.";

/**
 * Build resume review analysis prompt for Ollama
 */
export function buildOllamaResumeAnalysisPrompt(
  resumeText: string,
  toolData: ToolDataResume,
  baselineScore: BaselineScore,
  minScore: number,
  maxScore: number
): string {
  return `Score this resume. Baseline: ${baselineScore.score}, range: ${minScore}-${maxScore}.

Resume:
${resumeText}

Metrics: ${toolData.quantified.count} achievements, ${toolData.keywords.count} keywords, ${toolData.verbs.count} action verbs.
Keywords found: ${toolData.keywords.keywords.slice(0, 15).join(", ")}`;
}

/**
 * Build resume review feedback prompt for Ollama
 */
export function buildOllamaResumeFeedbackPrompt(
  resumeText: string,
  baselineScore: BaselineScore
): string {
  return `Give feedback on this resume. Score: ${baselineScore.score}.

Resume:
${resumeText}

Provide strengths, weaknesses, and suggestions.`;
}
