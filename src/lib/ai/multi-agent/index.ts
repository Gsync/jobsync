/**
 * Multi-Agent Collaboration System
 *
 * Architecture:
 * User Request → Tools → Baseline → [Analysis Agent, Feedback Agent] → Validation → Output
 *
 * Agents:
 * - Analysis Agent: Data analysis, keyword optimization, and scoring
 * - Feedback Agent: Actionable recommendations and synthesis
 * - Both agents run in parallel (independent of each other)
 */

export { multiAgentResumeReview } from "./resume-review";
export { multiAgentJobMatch } from "./job-match";
export { runWithRetry, withTimeout } from "./utils";
