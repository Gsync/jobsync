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
} from "./resume-review";

// Job Match exports
export {
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchPrompt,
  JOB_MATCH_SCORE_GUIDE,
  getSkillMatchPrompt,
  getSimilarityPrompt,
} from "./job-match";
