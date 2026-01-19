/**
 * Ollama-specific AI logic
 *
 * This module centralizes all Ollama-specific functionality:
 * - Result normalizers (Ollama → full schema)
 * - Utility functions and constants
 */

import type { ProviderType } from "../providers";
import { SEMANTIC_TIMEOUT_MS, AGENT_TIMEOUT_MS } from "../config";

// Re-export timeouts for backward compatibility
export { SEMANTIC_TIMEOUT_MS, AGENT_TIMEOUT_MS };

/**
 * Check if provider is Ollama (local models that need simplified prompts/schemas)
 */
export function isOllamaProvider(provider: ProviderType): boolean {
  return provider === "ollama";
}

// Normalizers
export {
  normalizeKeywordExtraction,
  normalizeActionVerbAnalysis,
  normalizeCombinedResumeAnalysis,
  normalizeSkillMatch,
  normalizeSemanticSimilarity,
} from "./normalizers";

// Re-export schemas from models for convenience
export {
  OllamaSemanticKeywordSchema,
  OllamaActionVerbSchema,
  OllamaCombinedResumeAnalysisSchema,
  OllamaSkillMatchSchema,
  OllamaSemanticSimilaritySchema,
  type OllamaSemanticKeywordExtraction,
  type OllamaActionVerbAnalysis,
  type OllamaCombinedResumeAnalysis,
  type OllamaSkillMatch,
  type OllamaSemanticSimilarity,
} from "@/models/ai.ollama-schemas";
