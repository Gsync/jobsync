/**
 * Ollama-specific AI logic
 *
 * This module centralizes all Ollama-specific functionality:
 * - Simplified prompts for local models
 * - Result normalizers (Ollama → full schema)
 * - Utility functions and constants
 */

// Utils
export {
  isOllamaProvider,
  SEMANTIC_TIMEOUT_MS,
  AGENT_TIMEOUT_MS,
} from "./utils";

// Normalizers
export {
  normalizeKeywordExtraction,
  normalizeActionVerbAnalysis,
  normalizeSkillMatch,
  normalizeSemanticSimilarity,
  normalizeAnalysisResult,
  normalizeFeedbackResult,
} from "./normalizers";

// Prompts
export {
  OLLAMA_ANALYSIS_SYSTEM_PROMPT,
  OLLAMA_FEEDBACK_SYSTEM_PROMPT,
  OLLAMA_JOB_MATCH_ANALYSIS_SYSTEM_PROMPT,
  OLLAMA_JOB_MATCH_FEEDBACK_SYSTEM_PROMPT,
  buildOllamaResumeAnalysisPrompt,
  buildOllamaResumeFeedbackPrompt,
  buildOllamaJobMatchAnalysisPrompt,
  buildOllamaJobMatchFeedbackPrompt,
} from "./prompts";

// Re-export schemas from models for convenience
export {
  OllamaSemanticKeywordSchema,
  OllamaActionVerbSchema,
  OllamaSkillMatchSchema,
  OllamaSemanticSimilaritySchema,
  OllamaAnalysisAgentSchema,
  OllamaFeedbackAgentSchema,
  type OllamaSemanticKeywordExtraction,
  type OllamaActionVerbAnalysis,
  type OllamaSkillMatch,
  type OllamaSemanticSimilarity,
  type OllamaAnalysisAgent,
  type OllamaFeedbackAgent,
} from "@/models/ai.ollama-schemas";
