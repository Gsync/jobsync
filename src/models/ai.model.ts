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
