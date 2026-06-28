import { APP_CONSTANTS } from "@/lib/constants";
import type { PrerankComponents } from "@/models/ai.schemas";
import type { JobDetails } from "../types";
import { scoreJob, passesFloor, locationMatches, buildIdf } from "./rank";

export interface PipelineConfig {
  targetTitles: string[];
  keywords: string[];
  locations: string[];
  strictLocation: boolean;
}

export interface ScoredJob {
  job: JobDetails;
  score: number;
  components: PrerankComponents;
}

export interface PipelineResult {
  // Top-K survivors to LLM-analyze (highest scoring).
  toAnalyze: ScoredJob[];
  // Remaining floor survivors saved un-analyzed.
  toSaveUnanalyzed: ScoredJob[];
  funnel: {
    deduped: number; // jobs handed in (already deduped by the runner)
    located: number | null; // survivors after strict location gate (null if off)
    relevant: number; // floor survivors after the cap ceiling (== total saved)
  };
}

// Pure funnel: optional strict-location gate -> score -> relevance floor ->
// cap ceiling -> top-K split. No I/O, no LLM; unit-testable in isolation.
export function runGreenhousePipeline(
  fetchedJobs: JobDetails[],
  config: PipelineConfig,
  resumeSkills: string[],
  options?: { k?: number; cap?: number; corpus?: JobDetails[] },
): PipelineResult {
  const k = options?.k ?? APP_CONSTANTS.MAX_JOBS_PER_RUN;
  const cap = options?.cap ?? APP_CONSTANTS.GREENHOUSE_LISTING_CAP;

  const deduped = fetchedJobs.length;

  // Term-rarity weights are derived from the full fetched corpus (pre-dedup) so
  // they stay stable on steady-state runs where few new jobs remain.
  const idf = buildIdf(options?.corpus ?? fetchedJobs);

  const gateActive = config.strictLocation && config.locations.length > 0;
  const located = gateActive
    ? fetchedJobs.filter((job) =>
        locationMatches(job.location, config.locations),
      )
    : null;

  const working = located ?? fetchedJobs;

  const scored: ScoredJob[] = working.map((job) => {
    const { score, components } = scoreJob(
      job,
      config.targetTitles,
      config.keywords,
      resumeSkills,
      config.locations,
      idf,
    );
    return { job, score, components };
  });

  const floorSurvivors = scored
    .filter((s) => passesFloor(s.components))
    .sort((a, b) => b.score - a.score);

  const capped = floorSurvivors.slice(0, cap);

  return {
    toAnalyze: capped.slice(0, k),
    toSaveUnanalyzed: capped.slice(k),
    funnel: {
      deduped,
      located: located ? located.length : null,
      relevant: capped.length,
    },
  };
}
