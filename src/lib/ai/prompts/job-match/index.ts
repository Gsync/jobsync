/**
 * Job Match Prompts - Barrel File
 */

// System prompts
export { JOB_MATCH_SYSTEM_PROMPT } from "./system";

// User prompt builders
export { buildJobMatchPrompt } from "./user";

// Calibration examples
export { JOB_MATCH_SCORE_GUIDE } from "./calibration";

// Semantic extraction prompts
export { getSkillMatchPrompt, getSimilarityPrompt } from "./semantic";
