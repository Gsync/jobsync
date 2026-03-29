// Re-export types from schemas
export type {
  ResumeReviewResponse,
  JobMatchResponse,
  RequirementMet,
  RequirementMissing,
  RequirementPartial,
  SkillsAnalysis,
  ExperienceAnalysis,
  KeywordsAnalysis,
  TailoringTip,
} from "./ai.schemas";
export { ResumeReviewSchema, JobMatchSchema } from "./ai.schemas";

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
  GEMINI = "gemini",
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

export enum DeepseekModel {
  DEEPSEEK_CHAT = "deepseek-chat",
  DEEPSEEK_REASONER = "deepseek-reasoner",
}

export enum GeminiModel {
  GEMINI_2_0_FLASH = "gemini-2.0-flash",
  GEMINI_2_0_FLASH_LITE = "gemini-2.0-flash-lite",
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
}

export const defaultModel: AiModel = {
  provider: AiProvider.OLLAMA,
  model: OllamaModel.LLAMA3_1,
};
