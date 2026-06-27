import { z } from "zod";

// RESUME REVIEW SCORES SCHEMA
// The review body is free-form markdown; only the four scores are structured
// (they drive the radial chart and score grid).

export const ResumeScoresSchema = z.object({
  overall: z.number().min(0).max(100),
  impact: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  atsCompatibility: z.number().min(0).max(100),
});

export type ResumeScores = z.infer<typeof ResumeScoresSchema>;

// JOB MATCH TYPES
// The match analysis is free-form markdown; only the score + recommendation are
// machine-readable (they drive the radial chart, jobs-table sorting, and the
// automation match threshold). Parsed from the leading `SCORES:` line.

export type JobMatchRecommendation =
  | "strong match"
  | "good match"
  | "partial match"
  | "weak match";

export type JobMatchScores = {
  matchScore: number;
  recommendation: JobMatchRecommendation;
};

// Parsed stream result (scores + markdown body).
export type JobMatchResult = {
  scores?: JobMatchScores;
  body: string;
};

// Persisted shape stored in Job.matchData (JSON string).
export type JobMatchData = JobMatchScores & {
  body: string;
  resumeId?: string;
  resumeTitle?: string;
  matchedAt?: string;
  provider?: string;
  model?: string;
};
