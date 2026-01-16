/**
 * Job Match Prompts - Barrel File
 */

// System prompts
export { JOB_MATCH_SYSTEM_PROMPT } from "./system";

// User prompt builders
export { buildJobMatchPrompt } from "./user";

// Calibration examples
export { JOB_MATCH_SCORE_GUIDE } from "./calibration";

// Ollama-specific prompts
export {
  OLLAMA_JOB_MATCH_ANALYSIS_SYSTEM_PROMPT,
  OLLAMA_JOB_MATCH_FEEDBACK_SYSTEM_PROMPT,
  buildOllamaJobMatchAnalysisPrompt,
  buildOllamaJobMatchFeedbackPrompt,
} from "./ollama";

// Semantic extraction prompts
export { getSkillMatchPrompt, getSimilarityPrompt } from "./semantic";
