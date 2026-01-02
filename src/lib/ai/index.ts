export { getModel, type ProviderType } from "./providers";
export {
  ResumeReviewSchema,
  JobMatchSchema,
  type ResumeReviewResponse,
  type JobMatchResponse,
  type JobMatchAnalysis,
} from "./schemas";

// Export both original and enhanced prompts
export {
  RESUME_REVIEW_SYSTEM_PROMPT,
  JOB_MATCH_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  buildJobMatchPrompt,
} from "./prompts";

// Phase 1 & 2: Export enhanced prompts and agents
export {
  RESUME_REVIEW_SYSTEM_PROMPT as ENHANCED_RESUME_REVIEW_SYSTEM_PROMPT,
  JOB_MATCH_SYSTEM_PROMPT as ENHANCED_JOB_MATCH_SYSTEM_PROMPT,
  buildResumeReviewPrompt as buildEnhancedResumeReviewPrompt,
  buildJobMatchPrompt as buildEnhancedJobMatchPrompt,
  CRITIC_SYSTEM_PROMPT,
} from "./prompts.enhanced";

export {
  enhancedResumeReviewAgent,
  enhancedJobMatchAgent,
  multiAgentResumeReview,
  multiAgentJobMatch,
  criticAgent,
} from "./agents.enhanced";

// Phase 3: Multi-agent collaboration
export {
  collaborativeResumeReview,
  collaborativeJobMatch,
  validateCollaborativeOutput,
} from "./multi-agent";

// Progress streaming
export type { ProgressUpdate, AgentStep } from "./progress-stream";
export {
  AGENT_STEPS,
  createProgressUpdate,
  encodeProgressMessage,
  ProgressStream,
} from "./progress-stream";

// Analysis tools
export {
  countQuantifiedAchievements,
  extractKeywords,
  countActionVerbs,
  calculateKeywordOverlap,
  analyzeFormatting,
  extractRequiredSkills,
} from "./tools";

// Scoring calculators
export {
  calculateResumeScore,
  calculateJobMatchScore,
  validateScore,
  SCORING_GUIDELINES,
} from "./scoring";

export { reviewResumeAgent, matchJobAgent } from "./agents";
export { checkRateLimit } from "./rate-limiter";
