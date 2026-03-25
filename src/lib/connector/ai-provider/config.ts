/**
 * AI Configuration Constants
 *
 * Centralized configuration for all AI-related constants including
 * timeouts, temperatures, rate limits, and retry settings.
 */

// TIMEOUTS
export const TIMEOUTS = {
  /** Timeout for semantic extraction calls (keywords, verbs, similarity) */
  SEMANTIC_MS: 60000, // 60 seconds
  /** Timeout for agent calls (analysis, feedback) */
  AGENT_MS: 120000, // 120 seconds
} as const;

// RATE LIMITING
export const RATE_LIMITS = {
  /** Time window for rate limiting in milliseconds */
  WINDOW_MS: 60 * 1000, // 1 minute
  /** Maximum requests per user per window */
  MAX_REQUESTS: 5,
  /** Maximum entries in rate limit store before cleanup */
  STORE_CLEANUP_THRESHOLD: 1000,
} as const;

// TEMPERATURES
export const TEMPERATURES = {
  /** Temperature for analysis agents (low for consistency) */
  ANALYSIS: 0.1,
  /** Temperature for feedback agents (slightly higher for creativity) */
  FEEDBACK: 0.3,
} as const;

// RETRY SETTINGS
export const RETRY = {
  /** Maximum number of retries for failed operations */
  MAX_ATTEMPTS: 1,
  /** Base delay in ms for exponential backoff */
  BASE_DELAY_MS: 1000,
  /** Backoff multiplier (delay = BASE_DELAY_MS * 2^attempt) */
  BACKOFF_MULTIPLIER: 2,
} as const;

// TEXT LIMITS (for prompts)
export const TEXT_LIMITS = {
  /** Character limit for Ollama (local models) */
  OLLAMA: {
    RESUME: 1500,
    JOB: 1200,
  },
  /** Character limit for cloud providers */
  CLOUD: {
    RESUME: 4000,
    JOB: 3500,
  },
} as const;

// SCORE VARIANCE
export const SCORE_VARIANCE = {
  /** Default allowed variance from baseline score */
  DEFAULT: 10,
  /** Variance for mid-range scores (40-60) - more subjective */
  MID_RANGE_RESUME: 12,
  MID_RANGE_JOB_MATCH: 15,
  /** Variance for extreme scores (<30 or >80) - more objective */
  EXTREME: 7,
} as const;

// Legacy exports for backward compatibility
export const SEMANTIC_TIMEOUT_MS = TIMEOUTS.SEMANTIC_MS;
export const AGENT_TIMEOUT_MS = TIMEOUTS.AGENT_MS;
export const WINDOW_MS = RATE_LIMITS.WINDOW_MS;
export const MAX_REQUESTS = RATE_LIMITS.MAX_REQUESTS;
