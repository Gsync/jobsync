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

// Phase 3: Multi-agent collaboration (V1 - 5 agents)
export {
  collaborativeResumeReview,
  collaborativeJobMatch,
  validateCollaborativeOutput,
} from "./multi-agent";

// Phase 2: Consolidated Multi-agent (V2 - 2 agents)
export {
  consolidatedMultiAgentResumeReview,
  consolidatedMultiAgentJobMatch,
} from "./multi-agent-v2";
export type { AgentInsightsV2, CollaborativeResultV2 } from "./multi-agent-v2";

// Adaptive selector (automatically chooses V1 or V2 based on env var)
export {
  adaptiveResumeReview,
  adaptiveJobMatch,
  getActiveVersion,
} from "./adaptive-selector";

// Progress streaming
export type { ProgressUpdate, AgentStep } from "./progress-stream";
export {
  AGENT_STEPS,
  createProgressUpdate,
  encodeProgressMessage,
  ProgressStream,
} from "./progress-stream";

// Analysis tools (legacy - prefer semantic functions below)
export {
  countQuantifiedAchievements,
  extractKeywords,
  countActionVerbs,
  calculateKeywordOverlap,
  analyzeFormatting,
  extractRequiredSkills,
} from "./tools";

// Phase 3: Semantic extraction and similarity functions (preferred)
export {
  extractSemanticKeywords,
  analyzeActionVerbs,
  performSemanticSkillMatch,
  calculateSemanticSimilarity,
  generateMatchExplanation,
  getKeywordCountFromSemantic,
  getVerbCountFromSemantic,
  // Deprecated legacy exports (for backwards compatibility)
  extractKeywordsLegacy,
  countActionVerbsLegacy,
  calculateKeywordOverlapLegacy,
} from "./tools";

// Phase 3: Semantic schemas
export {
  SemanticKeywordSchema,
  ActionVerbAnalysisSchema,
  SemanticSkillMatchSchema,
  SemanticSimilaritySchema,
  type SemanticKeywordExtraction,
  type ActionVerbAnalysis,
  type SemanticSkillMatch,
  type SemanticSimilarityResult,
} from "./schemas";

// Scoring calculators
export {
  calculateResumeScore,
  calculateJobMatchScore,
  validateScore,
  SCORING_GUIDELINES,
} from "./scoring";

export { reviewResumeAgent, matchJobAgent } from "./agents";
export { checkRateLimit } from "./rate-limiter";
