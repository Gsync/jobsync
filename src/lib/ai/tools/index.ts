/**
 * AI Analysis Tools - Barrel Export
 *
 * Modules:
 * - errors: Custom error classes for AI operations
 * - text-processing: Shared text normalization and metadata extraction
 * - preprocessing: Resume preprocessing (normalization, validation)
 * - preprocessing-job: Job description preprocessing
 * - semantic-extraction: LLM-powered skill matching and extraction
 * - semantic-similarity: LLM-powered similarity analysis
 */

// Error classes
export { AIUnavailableError } from "./errors";

// Shared text processing utilities
export {
  removeHtmlTags,
  normalizeWhitespace,
  normalizeBullets,
  normalizeHeadings,
  extractMetadata,
  validateText,
  type TextMetadata,
  type ValidationError,
  type ValidationResult,
} from "./text-processing";

// Resume preprocessing
export {
  preprocessResume,
  convertResumeToText,
  validateResume,
  type PreprocessingResult,
  type ResumeMetadata,
  type PreprocessedResume,
} from "./preprocessing";

// Job preprocessing
export {
  preprocessJob,
  convertJobToText,
  validateJob,
  type JobPreprocessingResult,
  type JobMetadata,
  type PreprocessedJob,
} from "./preprocessing-job";

// Semantic extraction (LLM-powered)
export { performSemanticSkillMatch } from "./semantic-extraction";

// Semantic similarity (LLM-powered)
export {
  calculateSemanticSimilarity,
  generateMatchExplanation,
} from "./semantic-similarity";
