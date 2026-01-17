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
  getKeywordPrompt,
  getVerbPrompt,
} from "./resume-review";

// Job Match exports
export {
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchPrompt,
  JOB_MATCH_SCORE_GUIDE,
  getSkillMatchPrompt,
  getSimilarityPrompt,
} from "./job-match";

// Shared exports
export { CRITIC_SYSTEM_PROMPT, buildCriticPrompt } from "./shared";
