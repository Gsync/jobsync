/**
 * Semantic Extraction Tools
 * Uses LLM for dynamic, context-aware extraction instead of hard-coded lists
 * Provider-aware prompts for Ollama vs Cloud optimization
 */

import { generateObject } from "ai";
import { getModel, ProviderType } from "../providers";
import {
  SemanticKeywordSchema,
  ActionVerbAnalysisSchema,
  SemanticSkillMatchSchema,
  type SemanticKeywordExtraction,
  type ActionVerbAnalysis,
  type SemanticSkillMatch,
} from "@/models/ai.schemas";
import {
  getKeywordPrompt,
  getVerbPrompt,
  getSkillMatchPrompt,
} from "../prompts/semantic-prompts";
import {
  isOllamaProvider,
  OllamaSemanticKeywordSchema,
  OllamaActionVerbSchema,
  OllamaSkillMatchSchema,
  normalizeKeywordExtraction,
  normalizeActionVerbAnalysis,
  normalizeSkillMatch,
  type OllamaSemanticKeywordExtraction,
  type OllamaActionVerbAnalysis,
  type OllamaSkillMatch,
} from "../ollama";
import { AIUnavailableError } from "./errors";

/**
 * Extract keywords using LLM for dynamic, semantic understanding
 * Replaces hard-coded keyword lists with intelligent extraction
 *
 * Benefits:
 * - Automatically adapts to new technologies
 * - Understands context (e.g., "python" in programming vs biology)
 * - Recognizes synonyms and variations (k8s = kubernetes)
 * - No maintenance required for keyword lists
 *
 * @param text - Resume or job description text
 * @param provider - AI provider (ollama/openai)
 * @param modelName - Model to use for extraction
 * @param contextHint - Optional hint about domain (e.g., "software engineering", "healthcare")
 */
export async function extractSemanticKeywords(
  text: string,
  provider: ProviderType = "ollama",
  modelName: string = "llama3.2",
  contextHint?: string
): Promise<SemanticKeywordExtraction> {
  const model = getModel(provider, modelName);
  const schema = isOllamaProvider(provider)
    ? OllamaSemanticKeywordSchema
    : SemanticKeywordSchema;
  const prompt = getKeywordPrompt(provider, text, contextHint);

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.1,
    });

    // Normalize Ollama result to full schema format
    if (isOllamaProvider(provider)) {
      return normalizeKeywordExtraction(
        object as OllamaSemanticKeywordExtraction
      );
    }

    return object as SemanticKeywordExtraction;
  } catch (error) {
    console.error("Semantic keyword extraction failed:", error);
    throw new AIUnavailableError("keyword extraction");
  }
}

/**
 * Analyze action verbs using LLM for semantic strength assessment
 * Replaces hard-coded verb lists with intelligent analysis
 *
 * Benefits:
 * - Understands verb strength in context
 * - Identifies passive constructions
 * - Provides specific improvement suggestions
 * - Recognizes weak phrases like "responsible for"
 *
 * @param text - Resume text to analyze
 * @param provider - AI provider (ollama/openai)
 * @param modelName - Model to use for analysis
 */
export async function analyzeActionVerbs(
  text: string,
  provider: ProviderType = "ollama",
  modelName: string = "llama3.2"
): Promise<ActionVerbAnalysis> {
  const model = getModel(provider, modelName);
  const schema = isOllamaProvider(provider)
    ? OllamaActionVerbSchema
    : ActionVerbAnalysisSchema;
  const prompt = getVerbPrompt(provider, text);

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.2,
    });

    // Normalize Ollama result to full schema format
    if (isOllamaProvider(provider)) {
      return normalizeActionVerbAnalysis(object as OllamaActionVerbAnalysis);
    }

    return object as ActionVerbAnalysis;
  } catch (error) {
    console.error("Action verb analysis failed:", error);
    throw new AIUnavailableError("action verb analysis");
  }
}

/**
 * Perform semantic skill matching between resume and job
 * Uses LLM to understand skill relationships and transferability
 *
 * Benefits:
 * - Recognizes related skills (PostgreSQL vs MySQL)
 * - Assesses skill transferability
 * - Provides learnability estimates
 * - Gives strategic application advice
 *
 * @param resumeText - Candidate's resume text
 * @param jobText - Job description text
 * @param provider - AI provider (ollama/openai)
 * @param modelName - Model to use for matching
 */
export async function performSemanticSkillMatch(
  resumeText: string,
  jobText: string,
  provider: ProviderType = "ollama",
  modelName: string = "llama3.2"
): Promise<SemanticSkillMatch> {
  const model = getModel(provider, modelName);
  const schema = isOllamaProvider(provider)
    ? OllamaSkillMatchSchema
    : SemanticSkillMatchSchema;
  const prompt = getSkillMatchPrompt(provider, resumeText, jobText);

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.2,
    });

    // Normalize Ollama result to full schema format
    if (isOllamaProvider(provider)) {
      return normalizeSkillMatch(object as OllamaSkillMatch);
    }

    // Post-process cloud result to remove empty strings and duplicates
    const cloudResult = object as SemanticSkillMatch;
    const cleanedResult = {
      exact_matches: cloudResult.exact_matches.filter(
        (match) =>
          match.skill.trim() &&
          match.resume_evidence.trim() &&
          match.job_requirement.trim()
      ),
      related_matches: cloudResult.related_matches.filter(
        (match) =>
          match.job_skill.trim() &&
          match.resume_skill.trim() &&
          match.explanation.trim()
      ),
      missing_skills: cloudResult.missing_skills.filter((skill) =>
        skill.skill.trim()
      ),
      overall_match_percentage: cloudResult.overall_match_percentage,
    };

    // Remove duplicate skills from missing_skills if they're in exact_matches
    const exactSkills = new Set(
      cleanedResult.exact_matches.map((m) => m.skill.toLowerCase())
    );
    cleanedResult.missing_skills = cleanedResult.missing_skills.filter(
      (m) => !exactSkills.has(m.skill.toLowerCase())
    );

    return cleanedResult;
  } catch (error) {
    console.error("Semantic skill matching failed:", error);
    throw new AIUnavailableError("skill matching");
  }
}

/**
 * Get keyword count from semantic extraction (for backward compatibility)
 */
export function getKeywordCountFromSemantic(
  extraction: SemanticKeywordExtraction
): number {
  return extraction.total_count;
}

/**
 * Get verb count from semantic analysis (for backward compatibility)
 */
export function getVerbCountFromSemantic(analysis: ActionVerbAnalysis): number {
  return analysis.strong_verbs.length;
}
