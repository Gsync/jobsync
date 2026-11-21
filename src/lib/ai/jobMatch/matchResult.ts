import type { JobMatchData, JobMatchScores, PrerankComponents } from "@/models/ai.schemas";
import type { DescriptionCompleteness } from "@/models/job.model";

export const UNANALYZED_MATCH_MARKER = '"analyzed":false';
export const UNANALYZED_MATCH_FILTER = { matchData: { contains: UNANALYZED_MATCH_MARKER } };

type Prerank = { prerankScore: number; prerankComponents: PrerankComponents };

export function buildPrerankMatchData(prerank: Prerank): string {
  return JSON.stringify({ ...prerank, analyzed: false });
}

export function buildLlmMatchData(input: {
  scores: JobMatchScores;
  body: string;
  resume?: { id: string; title: string };
  provider?: string;
  model?: string;
  surface?: string;
  matchedAt: Date;
  prerank?: Prerank;
  descriptionCompleteness?: DescriptionCompleteness;
}): string {
  return JSON.stringify({
    matchScore: input.scores.matchScore,
    recommendation: input.scores.recommendation,
    body: input.body,
    resumeId: input.resume?.id,
    resumeTitle: input.resume?.title,
    matchedAt: input.matchedAt.toISOString(),
    provider: input.provider,
    model: input.model,
    surface: input.surface,
    ...input.prerank,
    descriptionCompleteness: input.descriptionCompleteness,
    analyzed: true,
  } satisfies JobMatchData);
}

export function parseMatchData(raw: string | null | undefined): JobMatchData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function isAnalyzedMatch(raw: string | null | undefined): boolean {
  return parseMatchData(raw)?.analyzed !== false;
}
