/**
 * AI Analysis Tools
 * Re-exports from modular tools directory for backward compatibility
 *
 * @see ./tools/index.ts for the modular implementation
 */

export {
  // Error classes
  AIUnavailableError,
  // Achievement analysis
  countQuantifiedAchievements,
  // Formatting analysis
  analyzeFormatting,
  // Semantic extraction (LLM-powered)
  extractSemanticKeywords,
  analyzeActionVerbs,
  performSemanticSkillMatch,
  getKeywordCountFromSemantic,
  getVerbCountFromSemantic,
  // Semantic similarity (LLM-powered)
  calculateSemanticSimilarity,
  generateMatchExplanation,
} from "./tools/index";
