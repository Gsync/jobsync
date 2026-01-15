/**
 * Multi-Agent Analysis Functions
 * Uses V2 (2 agents) - consolidated system that's 40-50% faster and 60% cheaper
 *
 * V2 Architecture:
 * - Analysis Agent: Combines data analysis, keyword optimization, and scoring
 * - Feedback Agent: Generates actionable recommendations with synthesis
 */

import { ProviderType } from "./providers";
import { ProgressStream } from "./progress-stream";
import {
  consolidatedMultiAgentResumeReview,
  consolidatedMultiAgentJobMatch,
} from "./multi-agent-v2";
import {
  ResumeReviewResponse,
  JobMatchResponse,
  CollaborativeResultV2,
} from "@/models/ai.model";

/**
 * Resume review using V2 multi-agent system
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
): Promise<CollaborativeResultV2<ResumeReviewResponse>> {
  console.log("[Multi-Agent V2] Using 2-agent system for resume review");
  return consolidatedMultiAgentResumeReview(
    resumeText,
    provider,
    modelName,
    progressStream
  );
}

/**
 * Job match analysis using V2 multi-agent system
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
): Promise<CollaborativeResultV2<JobMatchResponse>> {
  console.log("[Multi-Agent V2] Using 2-agent system for job match");
  return consolidatedMultiAgentJobMatch(
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
export function getActiveVersion(): {
  version: "v2";
  agentCount: number;
  description: string;
  estimatedLatency: string;
  improvements: string;
} {
  return {
    version: "v2",
    agentCount: 2,
    description: "Consolidated Multi-Agent System (Analysis + Feedback)",
    estimatedLatency: "15-20s",
    improvements: "40-50% faster, 60% cheaper than previous 5-agent system",
  };
}
