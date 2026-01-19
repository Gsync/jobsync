export { getModel, type ProviderType } from "./providers";
export {
  ResumeReviewSchema,
  JobMatchSchema,
  type ResumeReviewResponse,
  type JobMatchResponse,
  type JobMatchAnalysis,
} from "@/models/ai.schemas";

// Prompts - used by non-collaborative endpoints
export {
  RESUME_REVIEW_SYSTEM_PROMPT,
  JOB_MATCH_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  buildJobMatchPrompt,
} from "./prompts";

// Analysis tools
export { AIUnavailableError } from "./tools";

// Preprocessing
export {
  preprocessResume,
  convertResumeToText,
  type PreprocessingResult,
  type ResumeMetadata,
  type PreprocessedResume,
} from "./tools";

// Semantic extraction and similarity functions
export {
  extractSemanticKeywords,
  analyzeActionVerbs,
  performSemanticSkillMatch,
  calculateSemanticSimilarity,
  generateMatchExplanation,
  getKeywordCountFromSemantic,
  getVerbCountFromSemantic,
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
} from "@/models/ai.schemas";

// Scoring calculators
export {
  calculateResumeScore,
  calculateJobMatchScore,
  validateScore,
  SCORING_GUIDELINES,
} from "./scoring";

export { checkRateLimit } from "./rate-limiter";
