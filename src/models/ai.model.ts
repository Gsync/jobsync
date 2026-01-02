// Re-export types from new schemas
export type {
  ResumeReviewResponse,
  JobMatchResponse,
  JobMatchAnalysis,
} from "@/lib/ai/schemas";

export interface AiModel {
  provider: AiProvider;
  model: string | undefined;
}

// Provider enum - extensible for future providers
export enum AiProvider {
  OLLAMA = "ollama",
  OPENAI = "openai",
  // Future providers:
  // GEMINI = "gemini",
  // DEEPSEEK = "deepseek",
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

export const defaultModel: AiModel = {
  provider: AiProvider.OLLAMA,
  model: OllamaModel.LLAMA3_1,
};
