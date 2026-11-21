import { isAnalyzedMatch, parseMatchData } from "@/lib/ai/jobMatch/matchResult";
import type { DiscoveredJob } from "@/models/automation.model";

// A job is "un-analyzed" only when matchData explicitly marks it so (Greenhouse
// floor survivors). Legacy jobs have no flag but carry a real AI score, so they
// count as analyzed.
export function isAnalyzed(job: DiscoveredJob): boolean {
  return isAnalyzedMatch(job.matchData);
}

// Lexical pre-rank as a percentage (weights sum to ~1, so raw × 100). Only
// Greenhouse jobs carry it; null for legacy jobs.
export function getPrerankPercent(job: DiscoveredJob): number | null {
  const raw = parseMatchData(job.matchData)?.prerankScore;
  return typeof raw === "number" ? Math.round(raw * 100) : null;
}
