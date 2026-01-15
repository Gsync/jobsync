/**
 * Semantic Similarity Tools
 * Complete semantic understanding of resume-job fit, replacing keyword overlap
 */

import { generateObject } from "ai";
import { getModel, ProviderType } from "../providers";
import {
  SemanticSimilaritySchema,
  type SemanticSimilarityResult,
  type SemanticSkillMatch,
} from "@/models/ai.schemas";
import { getSimilarityPrompt } from "../prompts/semantic-prompts";
import {
  isOllamaProvider,
  OllamaSemanticSimilaritySchema,
  normalizeSemanticSimilarity,
  type OllamaSemanticSimilarity,
} from "../ollama";
import { AIUnavailableError } from "./errors";

/**
 * Calculate semantic similarity between resume and job description
 * This is the core function that replaces keyword overlap entirely
 *
 * Uses LLM to:
 * 1. Calculate overall semantic similarity (0-100)
 * 2. Generate human-readable explanation of fit
 * 3. Identify key matching areas and gaps
 * 4. Provide strategic application advice
 *
 * @param resumeText - Candidate's resume text
 * @param jobDescription - Job description text
 * @param provider - AI provider (ollama/openai/deepseek)
 * @param modelName - Model to use
 * @returns SemanticSimilarityResult with score, explanations, and recommendations
 */
export async function calculateSemanticSimilarity(
  resumeText: string,
  jobDescription: string,
  provider: ProviderType = "ollama",
  modelName: string = "llama3.2"
): Promise<SemanticSimilarityResult> {
  const model = getModel(provider, modelName);
  const schema = isOllamaProvider(provider)
    ? OllamaSemanticSimilaritySchema
    : SemanticSimilaritySchema;
  const prompt = getSimilarityPrompt(provider, resumeText, jobDescription);

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.2,
    });

    // Normalize Ollama result to full schema format
    if (isOllamaProvider(provider)) {
      return normalizeSemanticSimilarity(object as OllamaSemanticSimilarity);
    }

    return object as SemanticSimilarityResult;
  } catch (error) {
    console.error("Semantic similarity calculation failed:", error);
    throw new AIUnavailableError("similarity calculation");
  }
}

/**
 * Generate a comprehensive match explanation combining semantic skill matching
 * and overall similarity assessment
 *
 * This function synthesizes data from performSemanticSkillMatch and calculateSemanticSimilarity
 * to create detailed, actionable explanations for the user
 *
 * @param skillMatch - Result from performSemanticSkillMatch
 * @param similarity - Result from calculateSemanticSimilarity
 * @returns Structured explanation with fit summary and detailed insights
 */
export function generateMatchExplanation(
  skillMatch: SemanticSkillMatch,
  similarity: SemanticSimilarityResult
): {
  summary: string;
  fit_assessment: string;
  strengths_explanation: string[];
  gaps_explanation: string[];
  transferable_explanation: string[];
  action_items: string[];
} {
  // Generate strengths explanation from exact and related matches
  const strengthsExplanation: string[] = [];

  skillMatch.exact_matches.slice(0, 3).forEach((match) => {
    strengthsExplanation.push(
      `✅ **${
        match.skill
      }**: Directly matches requirement - "${match.resume_evidence.substring(
        0,
        60
      )}..."`
    );
  });

  skillMatch.related_matches.slice(0, 2).forEach((match) => {
    strengthsExplanation.push(
      `⚡ **${match.resume_skill}** transfers to **${match.job_skill}** (${match.similarity}% similar): ${match.explanation}`
    );
  });

  // Generate gaps explanation with learnability context
  const gapsExplanation: string[] = [];

  skillMatch.missing_skills.slice(0, 4).forEach((skill) => {
    const urgencyIcon =
      skill.importance === "critical"
        ? "🔴"
        : skill.importance === "important"
        ? "🟡"
        : "🟢";
    const learnTime =
      skill.learnability === "quick"
        ? "<1 month"
        : skill.learnability === "moderate"
        ? "1-3 months"
        : "3+ months";
    gapsExplanation.push(
      `${urgencyIcon} **${skill.skill}** (${skill.importance}): Learning time ~${learnTime}`
    );
  });

  // Generate transferable skills explanation
  const transferableExplanation: string[] = similarity.transferable_skills.map(
    (skill) =>
      `💡 ${skill.resume_skill} → ${skill.job_skill}: ${skill.how_it_transfers}`
  );

  // Generate prioritized action items
  const actionItems: string[] = [];

  // Critical missing skills first
  const criticalMissing = skillMatch.missing_skills.filter(
    (s) => s.importance === "critical"
  );
  if (criticalMissing.length > 0) {
    actionItems.push(
      `🔴 Address critical gaps first: ${criticalMissing
        .map((s) => s.skill)
        .join(", ")}`
    );
  }

  // Quick wins
  const quickLearns = skillMatch.missing_skills.filter(
    (s) => s.learnability === "quick" && s.importance !== "nice-to-have"
  );
  if (quickLearns.length > 0) {
    actionItems.push(
      `⚡ Quick wins (learn in <1 month): ${quickLearns
        .map((s) => s.skill)
        .join(", ")}`
    );
  }

  // Highlight existing transferable skills in application
  if (skillMatch.related_matches.length > 0) {
    actionItems.push(
      `📝 Highlight transferable skills in cover letter: ${skillMatch.related_matches
        .slice(0, 3)
        .map((m) => m.resume_skill)
        .join(", ")}`
    );
  }

  // Fit assessment based on scores
  let fitAssessment: string;
  const score = similarity.similarity_score;
  if (score >= 75) {
    fitAssessment = "Excellent fit - You're a strong candidate for this role.";
  } else if (score >= 60) {
    fitAssessment = "Good fit - You match most requirements with minor gaps.";
  } else if (score >= 45) {
    fitAssessment =
      "Moderate fit - Some gaps exist but may be worth applying with a tailored resume.";
  } else if (score >= 30) {
    fitAssessment =
      "Weak fit - Significant gaps; consider upskilling before applying.";
  } else {
    fitAssessment =
      "Poor fit - This role may not align with your current skills and experience.";
  }

  return {
    summary: similarity.match_explanation,
    fit_assessment: fitAssessment,
    strengths_explanation: strengthsExplanation,
    gaps_explanation: gapsExplanation,
    transferable_explanation: transferableExplanation,
    action_items:
      actionItems.length > 0
        ? actionItems
        : ["No critical actions needed - proceed with application"],
  };
}
