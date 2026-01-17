/**
 * Phase 4: Simplified Ollama Schemas
 *
 * These schemas are optimized for small local models like llama3.2:
 * - Fewer fields (3-4 vs 5-6)
 * - Flatter structure (avoid deep nesting)
 * - Simpler descriptions
 */

import { z } from "zod";

/**
 * Simplified keyword extraction schema for Ollama
 * 3 fields vs 6 in the full schema
 */
export const OllamaSemanticKeywordSchema = z.object({
  technical_skills: z
    .array(z.string())
    .describe("Languages, frameworks, libraries"),
  tools: z.array(z.string()).describe("Platforms, services, tools"),
  total_count: z.number().describe("Total skills found"),
});

/**
 * Simplified action verb analysis schema for Ollama
 * 3 fields vs complex nested structure in full schema
 */
export const OllamaActionVerbSchema = z.object({
  strong_verbs: z.array(z.string()).describe("Strong action verbs found"),
  weak_verbs: z.array(z.string()).describe("Weak verbs to replace"),
  verb_strength_score: z
    .number()
    .min(0)
    .max(10)
    .describe("Overall strength 0-10"),
});

/**
 * Simplified skill matching schema for Ollama
 * Flatter structure with simpler matched_skills array
 */
export const OllamaSkillMatchSchema = z.object({
  matched_skills: z
    .array(
      z.object({
        skill: z.string(),
        evidence: z.string(),
      })
    )
    .describe("Skills found in both"),
  missing_skills: z.array(z.string()).describe("Required but not in resume"),
  match_percentage: z.number().min(0).max(100),
});

/**
 * Simplified semantic similarity schema for Ollama
 * 3 fields vs 6 in the full schema
 */
export const OllamaSemanticSimilaritySchema = z.object({
  similarity_score: z.number().min(0).max(100).describe("Overall fit 0-100"),
  match_explanation: z.string().describe("Why good/poor fit (2 sentences)"),
  key_gaps: z.array(z.string()).max(3).describe("Top missing skills"),
});

// Type exports for use in normalizer functions
export type OllamaSemanticKeywordExtraction = z.infer<
  typeof OllamaSemanticKeywordSchema
>;
export type OllamaActionVerbAnalysis = z.infer<typeof OllamaActionVerbSchema>;
export type OllamaSkillMatch = z.infer<typeof OllamaSkillMatchSchema>;
export type OllamaSemanticSimilarity = z.infer<
  typeof OllamaSemanticSimilaritySchema
>;
