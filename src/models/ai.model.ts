// Import types needed in this file
import type {
  SemanticSkillMatch,
  SemanticSimilarityResult,
} from "./ai.schemas";

// Re-export types from new schemas
export type {
  ResumeReviewResponse,
  JobMatchResponse,
  JobMatchAnalysis,
  SemanticKeywordExtraction,
  ActionVerbAnalysis,
  SemanticSkillMatch,
  SemanticSimilarityResult,
} from "./ai.schemas";
export {
  ResumeReviewSchema,
  JobMatchSchema,
  SemanticKeywordSchema,
  ActionVerbAnalysisSchema,
  SemanticSkillMatchSchema,
  SemanticSimilaritySchema,
} from "./ai.schemas";

// JOB MATCH TYPES

export interface SemanticData {
  skillMatch: SemanticSkillMatch | null;
  similarity: SemanticSimilarityResult | null;
  matchExplanation: {
    summary: string;
    fit_assessment: string;
    strengths_explanation: string[];
    gaps_explanation: string[];
    transferable_explanation: string[];
    action_items: string[];
  } | null;
}

export interface ToolDataResume {
  quantified: { count: number; examples: string[] };
  keywords: { keywords: string[]; count: number };
  verbs: { count: number; verbs: string[] };
  formatting: {
    hasBulletPoints: boolean;
    hasConsistentSpacing: boolean;
    averageLineLength: number;
    sectionCount: number;
  };
}

export interface ToolDataJobMatch {
  keywordOverlap: {
    overlapPercentage: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    totalJobKeywords: number;
  };
  resumeKeywords: { keywords: string[]; count: number };
  jobKeywords: { keywords: string[]; count: number };
  requiredSkills: {
    requiredSkills: string[];
    preferredSkills: string[];
    totalSkills: number;
  };
}

// AI MODEL

export interface AiModel {
  provider: AiProvider;
  model: string | undefined;
}

// Provider enum - extensible for future providers
export enum AiProvider {
  OLLAMA = "ollama",
  OPENAI = "openai",
  DEEPSEEK = "deepseek",
  // Future providers:
  // GEMINI = "gemini",
  // CLAUDE = "claude",
}

// Default models per provider
export enum OllamaModel {
  LLAMA3_1 = "llama3.1",
  LLAMA3_2 = "llama3.2",
}

export enum OpenaiModel {
  GPT3_5 = "gpt-3.5-turbo",
  GPT4O = "gpt-4o",
  GPT4O_MINI = "gpt-4o-mini",
}

// DeepSeek models - fallback if API is unavailable
export enum DeepseekModel {
  DEEPSEEK_CHAT = "deepseek-chat",
  DEEPSEEK_REASONER = "deepseek-reasoner",
}

export const defaultModel: AiModel = {
  provider: AiProvider.OLLAMA,
  model: OllamaModel.LLAMA3_1,
};
