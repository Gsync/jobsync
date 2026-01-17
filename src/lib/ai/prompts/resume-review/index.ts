/**
 * Resume Review Prompts - Barrel File
 */

// System prompts
export { RESUME_REVIEW_SYSTEM_PROMPT } from "./system";

// User prompt builders
export { buildResumeReviewPrompt } from "./user";

// Calibration examples
export {
  RESUME_CALIBRATION_EXAMPLES,
  SCORING_PHASES,
  SCORE_INTERPRETATION_GUIDE,
} from "./calibration";

// Semantic extraction prompts
export { getKeywordPrompt, getVerbPrompt } from "./semantic";
