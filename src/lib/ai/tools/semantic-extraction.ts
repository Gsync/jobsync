/**
 * Semantic Extraction Tools
 * Uses LLM for dynamic, context-aware extraction instead of hard-coded lists
 * Provider-aware prompts for Ollama vs Cloud optimization
 */

import { generateText, Output } from "ai";
import { getModel, ProviderType } from "../providers";
import {
  CombinedResumeAnalysisSchema,
  SemanticSkillMatchSchema,
  type CombinedResumeAnalysis,
  type SemanticSkillMatch,
} from "@/models/ai.schemas";
// ...existing code...
import { getSkillMatchPrompt } from "../prompts";
import {
  isOllamaProvider,
  OllamaCombinedResumeAnalysisSchema,
  OllamaSkillMatchSchema,
  normalizeCombinedResumeAnalysis,
  normalizeSkillMatch,
} from "../ollama";
import { AIUnavailableError } from "./errors";

/**
 * Extract keywords and analyze action verbs in a single LLM call
 * Replaces two separate calls with one optimized call
 *
 * Benefits:
 * - 50% faster (one LLM call vs two)
 * - Lower token usage
 * - Better context sharing between keyword and verb analysis
 *
 * @param text - Resume text to analyze
 * @param provider - AI provider (ollama/openai)
 * @param modelName - Model to use for analysis
 * @param contextHint - Optional hint about domain (e.g., "software engineering")
 */

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
  modelName: string = "llama3.2",
): Promise<SemanticSkillMatch> {
  const model = getModel(provider, modelName);
  const prompt = getSkillMatchPrompt(provider, resumeText, jobText);

  try {
    if (isOllamaProvider(provider)) {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: OllamaSkillMatchSchema }),
        prompt,
        temperature: 0.2,
      });
      return normalizeSkillMatch(output);
    }

    const { output } = await generateText({
      model,
      output: Output.object({ schema: SemanticSkillMatchSchema }),
      prompt,
      temperature: 0.2,
    });

    // Post-process cloud result to remove empty strings and duplicates
    const cleanedResult = {
      exact_matches: output.exact_matches.filter(
        (match) =>
          match.skill.trim() &&
          match.resume_evidence.trim() &&
          match.job_requirement.trim(),
      ),
      related_matches: output.related_matches.filter(
        (match) =>
          match.job_skill.trim() &&
          match.resume_skill.trim() &&
          match.explanation.trim(),
      ),
      missing_skills: output.missing_skills.filter((skill) =>
        skill.skill.trim(),
      ),
      overall_match_percentage: output.overall_match_percentage,
    };

    // Remove duplicate skills from missing_skills if they're in exact_matches
    const exactSkills = new Set(
      cleanedResult.exact_matches.map((m) => m.skill.toLowerCase()),
    );
    cleanedResult.missing_skills = cleanedResult.missing_skills.filter(
      (m) => !exactSkills.has(m.skill.toLowerCase()),
    );

    return cleanedResult;
  } catch (error) {
    console.error("Semantic skill matching failed:", error);
    throw new AIUnavailableError("skill matching");
  }
}
