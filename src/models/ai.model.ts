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

// ============================================================================
// MULTI-AGENT TYPES
// ============================================================================

export interface AgentInsightsV2 {
  analysis: AnalysisResult;
  feedback: FeedbackResult;
}

export interface AnalysisResult {
  finalScore: number;
  dataInsights: {
    quantifiedCount: number;
    keywordCount: number;
    verbCount: number;
    formatQuality: string;
  };
  keywordAnalysis: {
    strength: string;
    atsScore: number;
    missingCritical: string[];
    recommendations: string[];
  };
  adjustments: Array<{
    criterion: string;
    adjustment: number;
    reason: string;
  }>;
  math: string;
}

export interface FeedbackResult {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  synthesisNotes: string;
}

export interface CollaborativeResultV2<T> {
  analysis: T;
  agentInsights: AgentInsightsV2;
  baselineScore: { score: number; breakdown: Record<string, number> };
  warnings?: string[];
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

// ============================================================================
// AI MODEL
// ============================================================================

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
