/**
 * AI Analysis Tools
 * Provide accurate counting and extraction functions for resume analysis
 *
 * Modules:
 * - errors: Custom error classes for AI operations
 * - achievement: Extract and analyze quantified achievements
 * - formatting: Analyze text structure and formatting
 * - semantic-extraction: LLM-powered keyword and skill extraction
 * - semantic-similarity: LLM-powered similarity analysis
 */

// Error classes
export { AIUnavailableError } from "./errors";

// Achievement analysis
export { countQuantifiedAchievements } from "./achievement";

// Formatting analysis
export { analyzeFormatting } from "./formatting";

// Semantic extraction (LLM-powered)
export {
  extractSemanticKeywords,
  analyzeActionVerbs,
  performSemanticSkillMatch,
  getKeywordCountFromSemantic,
  getVerbCountFromSemantic,
} from "./semantic-extraction";

// Semantic similarity (LLM-powered)
export {
  calculateSemanticSimilarity,
  generateMatchExplanation,
} from "./semantic-similarity";
