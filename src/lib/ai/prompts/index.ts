/**
 * AI Prompts - Main Barrel File
 *
 * Re-exports from feature-specific modules for backward compatibility.
 * For new code, import directly from the specific module:
 *   - ./resume-review for resume analysis prompts
 *   - ./job-match for job matching prompts
 *   - ./shared for validation/critic prompts
 */

// Resume Review exports
export {
  RESUME_REVIEW_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  RESUME_CALIBRATION_EXAMPLES,
  SCORING_PHASES,
  SCORE_INTERPRETATION_GUIDE,
  ANALYSIS_AGENT_PROMPT,
  FEEDBACK_AGENT_PROMPT,
  OLLAMA_ANALYSIS_SYSTEM_PROMPT,
  OLLAMA_FEEDBACK_SYSTEM_PROMPT,
  buildOllamaResumeAnalysisPrompt,
  buildOllamaResumeFeedbackPrompt,
  getKeywordPrompt,
  getVerbPrompt,
} from "./resume-review";

// Job Match exports
export {
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchPrompt,
  JOB_MATCH_SCORE_GUIDE,
  OLLAMA_JOB_MATCH_ANALYSIS_SYSTEM_PROMPT,
  OLLAMA_JOB_MATCH_FEEDBACK_SYSTEM_PROMPT,
  buildOllamaJobMatchAnalysisPrompt,
  buildOllamaJobMatchFeedbackPrompt,
  getSkillMatchPrompt,
  getSimilarityPrompt,
} from "./job-match";

// Shared exports
export { CRITIC_SYSTEM_PROMPT, buildCriticPrompt } from "./shared";
