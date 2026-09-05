import type { DiscoveredJob } from "@/models/automation.model";

// A job is "un-analyzed" only when matchData explicitly marks it so (Greenhouse
// floor survivors). Legacy jobs have no flag but carry a real AI score, so they
// count as analyzed.
export function isAnalyzed(job: DiscoveredJob): boolean {
  try {
    return JSON.parse(job.matchData ?? "{}").analyzed !== false;
  } catch {
    return true;
  }
}

// Lexical pre-rank as a percentage (weights sum to ~1, so raw × 100). Only
// Greenhouse jobs carry it; null for legacy jobs.
export function getPrerankPercent(job: DiscoveredJob): number | null {
  try {
    const raw = JSON.parse(job.matchData ?? "{}").prerankScore;
    return typeof raw === "number" ? Math.round(raw * 100) : null;
  } catch {
    return null;
  }
}
