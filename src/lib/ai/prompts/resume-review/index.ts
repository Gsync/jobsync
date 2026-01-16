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

// Agent prompts
export { ANALYSIS_AGENT_PROMPT, FEEDBACK_AGENT_PROMPT } from "./agents";

// Ollama-specific prompts
export {
  OLLAMA_ANALYSIS_SYSTEM_PROMPT,
  OLLAMA_FEEDBACK_SYSTEM_PROMPT,
  buildOllamaResumeAnalysisPrompt,
  buildOllamaResumeFeedbackPrompt,
} from "./ollama";

// Semantic extraction prompts
export { getKeywordPrompt, getVerbPrompt } from "./semantic";
