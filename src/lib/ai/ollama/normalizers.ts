/**
 * Ollama result normalizers
 *
 * These functions convert Ollama's simplified schema output
 * to the full schema format expected by the rest of the application.
 */

import type {
  OllamaSemanticKeywordExtraction,
  OllamaActionVerbAnalysis,
  OllamaCombinedResumeAnalysis,
  OllamaSkillMatch,
  OllamaSemanticSimilarity,
} from "@/models/ai.ollama-schemas";
import type {
  SemanticKeywordExtraction,
  ActionVerbAnalysis,
  CombinedResumeAnalysis,
  SemanticSkillMatch,
  SemanticSimilarityResult,
} from "@/models/ai.schemas";

/**
 * Normalize Ollama keyword extraction to full schema format
 */
export function normalizeKeywordExtraction(
  ollamaResult: OllamaSemanticKeywordExtraction,
): SemanticKeywordExtraction {
  return {
    technical_skills: ollamaResult.technical_skills,
    tools_platforms: ollamaResult.tools || [],
    methodologies: [],
    domain_knowledge: [],
    soft_skills: [],
    total_count: ollamaResult.total_count,
  };
}

/**
 * Normalize Ollama action verb analysis to full schema format
 */
export function normalizeActionVerbAnalysis(
  ollamaResult: OllamaActionVerbAnalysis,
): ActionVerbAnalysis {
  return {
    strong_verbs: ollamaResult.strong_verbs.map((verb) => ({
      verb,
      context: "Found in resume",
      impact_level: "medium" as const,
    })),
    weak_verbs: ollamaResult.weak_verbs.map((verb) => ({
      verb,
      context: "Found in resume",
      suggestion: "",
    })),
    verb_strength_score: ollamaResult.verb_strength_score,
  };
}

/**
 * Normalize Ollama combined resume analysis to full schema format
 */
export function normalizeCombinedResumeAnalysis(
  ollamaResult: OllamaCombinedResumeAnalysis,
): CombinedResumeAnalysis {
  return {
    keywords: normalizeKeywordExtraction(ollamaResult.keywords),
    verbs: normalizeActionVerbAnalysis(ollamaResult.verbs),
  };
}

/**
 * Normalize Ollama skill match to full schema format
 */
export function normalizeSkillMatch(
  ollamaResult: OllamaSkillMatch,
): SemanticSkillMatch {
  return {
    exact_matches: ollamaResult.matched_skills
      .filter((m) => m.skill.trim())
      .map((m) => ({
        skill: m.skill,
        resume_evidence: m.evidence,
        job_requirement: "Required by job",
      })),
    related_matches: [],
    missing_skills: ollamaResult.missing_skills
      .filter((s) => s.trim())
      .map((skill) => ({
        skill,
        importance: "important" as const,
        learnability: "moderate" as const,
      })),
    overall_match_percentage: ollamaResult.match_percentage,
  };
}

/**
 * Normalize Ollama semantic similarity to full schema format
 */
export function normalizeSemanticSimilarity(
  ollamaResult: OllamaSemanticSimilarity,
): SemanticSimilarityResult {
  return {
    similarity_score: ollamaResult.similarity_score,
    match_explanation: ollamaResult.match_explanation,
    key_matches: [],
    key_gaps: ollamaResult.key_gaps.map((gap) => ({
      skill: gap,
      note: "Missing from resume",
    })),
    transferable_skills: [],
    application_recommendation:
      ollamaResult.similarity_score >= 60
        ? "Consider applying - good fit"
        : "Consider upskilling before applying",
  };
}
