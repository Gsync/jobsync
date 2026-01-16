/**
 * Generic Agent Executor
 *
 * Handles parallel execution of Analysis and Feedback agents with:
 * - Provider-aware schema selection
 * - Timeout and retry logic
 * - Ollama result normalization
 */

import { generateObject } from "ai";
import {
  AnalysisResult,
  FeedbackResult,
  AgentExecutorParams,
  AgentExecutorResult,
} from "@/models/ai.model";
import {
  isOllamaProvider,
  AGENT_TIMEOUT_MS,
  normalizeAnalysisResult,
  normalizeFeedbackResult,
  type OllamaAnalysisAgent,
  type OllamaFeedbackAgent,
} from "../../ollama";
import { runWithRetry, withTimeout } from "../utils";

export async function executeAgents(
  params: AgentExecutorParams
): Promise<AgentExecutorResult> {
  const { model, provider, analysis, feedback, verbCount } = params;
  const isOllama = isOllamaProvider(provider);

  const [rawAnalysis, rawFeedback] = await Promise.all([
    withTimeout(
      runWithRetry(async () => {
        const { object } = await generateObject({
          model,
          schema: analysis.schema,
          system: analysis.systemPrompt,
          prompt: analysis.prompt,
          temperature: analysis.temperature,
        });
        return object;
      }, "Analysis Agent"),
      AGENT_TIMEOUT_MS,
      "Analysis Agent"
    ),

    withTimeout(
      runWithRetry(async () => {
        const { object } = await generateObject({
          model,
          schema: feedback.schema,
          system: feedback.systemPrompt,
          prompt: feedback.prompt,
          temperature: feedback.temperature,
        });
        return object;
      }, "Feedback Agent"),
      AGENT_TIMEOUT_MS,
      "Feedback Agent"
    ),
  ]);

  if (isOllama) {
    return {
      analysisResult: normalizeAnalysisResult(
        rawAnalysis as OllamaAnalysisAgent,
        verbCount
      ),
      feedbackResult: normalizeFeedbackResult(
        rawFeedback as OllamaFeedbackAgent
      ),
    };
  }

  return {
    analysisResult: rawAnalysis as AnalysisResult,
    feedbackResult: rawFeedback as FeedbackResult,
  };
}
