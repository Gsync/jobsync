export { getModel, type ProviderType } from "./providers";
export type {
  JobMatchScores,
  JobMatchResult,
  JobMatchData,
} from "@/models/ai.schemas";
export { parseJobMatch } from "./jobMatch/parse";

// Prompts
export {
  RESUME_REVIEW_SYSTEM_PROMPT,
  JOB_MATCH_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  buildJobMatchPrompt,
  AUTOMATION_JOB_MATCH_SYSTEM_PROMPT,
  buildAutomationJobMatchPrompt,
  COVER_LETTER_SYSTEM_PROMPT,
  buildCoverLetterPrompt,
} from "./prompts";

// Analysis tools
export { AIUnavailableError } from "./tools";

// Resume preprocessing
export {
  preprocessResume,
  preprocessText,
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
