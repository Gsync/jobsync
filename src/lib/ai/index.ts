export { getModel, type ProviderType } from "./providers";
export {
  ResumeReviewSchema,
  JobMatchSchema,
  type ResumeReviewResponse,
  type JobMatchResponse,
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

export { checkRateLimit } from "./rate-limiter";
