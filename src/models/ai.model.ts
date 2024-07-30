export interface ResumeReviewResponse {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  score: number;
}
export interface JobMatchResponse {
  matching_score: number;
  detailed_analysis: JobMatchAnalysis[];
  suggestions: JobMatchAnalysis[];
  additional_comments: string[];
}

export type JobMatchAnalysis = {
  category: string;
  value: string[];
};

export interface AiModel {
  provider: AiProvider;
  model: string | undefined;
}

export enum AiProvider {
  OLLAMA = "ollama",
  OPENAI = "openai",
}

export enum OllamaModel {
  LLAMA3_1 = "llama3.1",
}

export enum OpenaiModel {
  GPT3_5 = "gpt-3.5-turbo",
}
