/**
 * Multi-Agent Analysis Functions
 *
 * Architecture:
 * - Analysis Agent: Data analysis, keyword optimization, and scoring
 * - Feedback Agent: Actionable recommendations with synthesis
 */

import { ProviderType } from "./providers";
import { ProgressStream } from "./progress-stream";
import {
  multiAgentResumeReview,
  multiAgentJobMatch,
} from "./multi-agent";
import {
  ResumeReviewResponse,
  JobMatchResponse,
  CollaborativeResult,
} from "@/models/ai.model";

/**
 * Resume review using multi-agent system
 *
 * @param resumeText - The resume content to review
 * @param provider - AI provider to use
 * @param modelName - Model name for the provider
 * @param progressStream - Optional progress stream for real-time updates
 * @returns Resume review analysis
 */
export async function adaptiveResumeReview(
  resumeText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResult<ResumeReviewResponse>> {
  console.log("[Multi-Agent] Running resume review");
  return multiAgentResumeReview(
    resumeText,
    provider,
    modelName,
    progressStream
  );
}

/**
 * Job match analysis using multi-agent system
 *
 * @param resumeText - The resume content
 * @param jobDescription - The job description
 * @param provider - AI provider to use
 * @param modelName - Model name for the provider
 * @param progressStream - Optional progress stream for real-time updates
 * @returns Job match analysis
 */
export async function adaptiveJobMatch(
  resumeText: string,
  jobDescription: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResult<JobMatchResponse>> {
  console.log("[Multi-Agent] Running job match");
  return multiAgentJobMatch(
    resumeText,
    jobDescription,
    provider,
    modelName,
    progressStream
  );
}

/**
 * Get information about the multi-agent system
 */
export function getSystemInfo(): {
  agentCount: number;
  description: string;
  estimatedLatency: string;
} {
  return {
    agentCount: 2,
    description: "Multi-Agent System (Analysis + Feedback)",
    estimatedLatency: "15-20s",
  };
}
