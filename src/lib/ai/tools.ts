/**
 * AI Analysis Tools - Provide accurate counting and extraction functions
 * These tools give agents the ability to perform precise analysis programmatically
 */

/**
 * Extract and count quantified achievements (numbers, percentages, metrics)
 */
export function countQuantifiedAchievements(text: string): {
  count: number;
  examples: string[];
} {
  // Match patterns like: "40%", "$2M", "5+ years", "Increased by 50%"
  const patterns = [
    /\d+%/g, // Percentages: 40%
    /\$[\d,]+[KMB]?/g, // Money: $2M, $500K
    /\d+\+?\s*(years?|months?|weeks?)/gi, // Time: 5+ years
    /(increased|decreased|improved|reduced|grew|boosted)\s+by\s+\d+/gi, // Actions with numbers
    /\d+x\s+(faster|better|more)/gi, // Multipliers: 2x faster
    /team\s+of\s+\d+/gi, // Team size: team of 12
    /\d+\s+(clients?|customers?|users?|projects?)/gi, // Quantities
  ];

  const matches = new Set<string>();
  patterns.forEach((pattern) => {
    const found = text.match(pattern);
    if (found) {
      found.forEach((m) => matches.add(m));
    }
  });

  const examples = Array.from(matches).slice(0, 5); // Top 5 examples
  return { count: matches.size, examples };
}

// ============================================================================
// AI UNAVAILABLE ERROR - Used when semantic extraction fails
// ============================================================================

export class AIUnavailableError extends Error {
  constructor(operation: string) {
    super(`AI unavailable for ${operation}. Please try again later.`);
    this.name = "AIUnavailableError";
  }
}

// ============================================================================
// TEXT ANALYSIS UTILITIES (no hardcoded keyword lists)
// ============================================================================

/**
 * Analyze text structure and formatting quality
 */
export function analyzeFormatting(text: string): {
  hasBulletPoints: boolean;
  hasConsistentSpacing: boolean;
  averageLineLength: number;
  sectionCount: number;
} {
  const lines = text.split("\n");
  const bulletLines = lines.filter(
    (line) =>
      line.trim().startsWith("•") ||
      line.trim().startsWith("-") ||
      line.trim().startsWith("*")
  );

  const hasBulletPoints = bulletLines.length > 3;

  // Count potential sections (all caps lines or lines ending with :)
  const sectionHeaders = lines.filter(
    (line) =>
      (line.trim().length > 0 && line === line.toUpperCase()) ||
      line.trim().endsWith(":")
  );

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const averageLineLength =
    nonEmptyLines.reduce((sum, line) => sum + line.length, 0) /
    Math.max(nonEmptyLines.length, 1);

  return {
    hasBulletPoints,
    hasConsistentSpacing: averageLineLength > 20 && averageLineLength < 100,
    averageLineLength: Math.round(averageLineLength),
    sectionCount: sectionHeaders.length,
  };
}

// ============================================================================
// SEMANTIC EXTRACTION FUNCTIONS (Phase 1 Improvements + Phase 4 Optimization)
// Uses LLM for dynamic, context-aware extraction instead of hard-coded lists
// Phase 4: Provider-aware prompts for Ollama vs Cloud optimization
// ============================================================================

import { generateObject } from "ai";
import { getModel, ProviderType } from "./providers";
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
  getSimilarityPrompt,
} from "./prompts/semantic-prompts";
import {
  OllamaSemanticKeywordSchema,
  OllamaActionVerbSchema,
  OllamaSkillMatchSchema,
  OllamaSemanticSimilaritySchema,
} from "@/models/ai.ollama-schemas";

/**
 * Check if provider is Ollama (local models that need simplified prompts)
 */
function isOllamaProvider(provider: ProviderType): boolean {
  return provider === "ollama";
}

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
  // Phase 4: Provider-aware schema and prompt selection
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
      return {
        technical_skills: object.technical_skills,
        tools_platforms: (object as { tools: string[] }).tools || [],
        methodologies: [],
        domain_knowledge: [],
        soft_skills: [],
        total_count: object.total_count,
      };
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
  // Phase 4: Provider-aware schema and prompt selection
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
      const ollamaResult = object as {
        strong_verbs: string[];
        weak_verbs: string[];
        verb_strength_score: number;
      };
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
  // Phase 4: Provider-aware schema and prompt selection
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
      const ollamaResult = object as {
        matched_skills: Array<{ skill: string; evidence: string }>;
        missing_skills: string[];
        match_percentage: number;
      };
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

// ============================================================================
// PHASE 3: SEMANTIC SIMILARITY WITH EXPLANATIONS
// Complete semantic understanding of resume-job fit, replacing keyword overlap
// ============================================================================

import {
  SemanticSimilaritySchema,
  type SemanticSimilarityResult,
} from "@/models/ai.schemas";

/**
 * Calculate semantic similarity between resume and job description
 * This is the core Phase 3 function that replaces keyword overlap entirely
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
  // Phase 4: Provider-aware schema and prompt selection
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
      const ollamaResult = object as {
        similarity_score: number;
        match_explanation: string;
        key_gaps: string[];
      };
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

