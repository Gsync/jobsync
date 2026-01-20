export { getModel, type ProviderType } from "./providers";
export {
  ResumeReviewSchema,
  JobMatchSchema,
  type ResumeReviewResponse,
  type JobMatchResponse,
  type JobMatchAnalysis,
} from "@/models/ai.schemas";

// Prompts
export {
  RESUME_REVIEW_SYSTEM_PROMPT,
  JOB_MATCH_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  buildJobMatchPrompt,
} from "./prompts";

// Analysis tools
export { AIUnavailableError } from "./tools";

// Resume preprocessing
export {
  preprocessResume,
  convertResumeToText,
  type PreprocessingResult,
  type ResumeMetadata,
  type PreprocessedResume,
} from "./tools/preprocessing";

// Job preprocessing
export {
  preprocessJob,
  convertJobToText,
  type JobPreprocessingResult,
  type JobMetadata,
  type PreprocessedJob,
} from "./tools/preprocessing-job";

// Shared text processing utilities
export {
  removeHtmlTags,
  normalizeWhitespace,
  normalizeBullets,
  normalizeHeadings,
  extractMetadata,
  validateText,
  type TextMetadata,
} from "./tools/text-processing";

// Semantic extraction for job matching (still used)
export {
  performSemanticSkillMatch,
  calculateSemanticSimilarity,
  generateMatchExplanation,
} from "./tools";

// Schemas for job matching
export {
  SemanticSkillMatchSchema,
  SemanticSimilaritySchema,
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
