import { APP_CONSTANTS } from "@/lib/constants";
import type { PrerankComponents } from "@/models/ai.schemas";
import type { JobDetails } from "../types";

export type { PrerankComponents };

const TITLE_STOP = new Set([
  "of",
  "and",
  "the",
  "a",
  "an",
  "for",
  "to",
  "in",
  "at",
  "with",
  "or",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((token) => token.length > 1 && !TITLE_STOP.has(token));
}

// Whole-term match with word boundaries so "react" does not match "reactive".
function termInText(text: string, term: string): boolean {
  const clean = term.trim().toLowerCase();
  if (!clean) return false;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i");
  return re.test(text);
}

// "Remote" always passes. Empty preference = no constraint (gate passes all).
export function locationMatches(jobLocation: string, wanted: string[]): boolean {
  const loc = (jobLocation || "").toLowerCase();
  if (loc.includes("remote")) return true;
  if (!wanted || wanted.length === 0) return true;
  return wanted.some((w) => {
    const ww = w.trim().toLowerCase();
    return ww.length > 0 && loc.includes(ww);
  });
}

function recencyTiebreak(postedDate?: string): number {
  if (!postedDate) return 0;
  const t = Date.parse(postedDate);
  if (Number.isNaN(t)) return 0;
  const ageDays = (Date.now() - t) / 86_400_000;
  const fresh = Math.max(0, 1 - ageDays / 180); // ~0 after ~6 months
  return fresh * 0.01;
}

// Returns the raw lexical score plus the component breakdown (persisted in
// matchData.prerankComponents for tuning). Raw score sorts the un-analyzed
// tier; it is never shown as a percentage.
export function scoreJob(
  job: JobDetails,
  targetTitles: string[],
  keywords: string[],
  resumeSkills: string[],
  locations: string[],
): { score: number; components: PrerankComponents } {
  const targetTokens = new Set<string>();
  for (const title of targetTitles) {
    for (const token of tokenize(title)) targetTokens.add(token);
  }
  const jobTitleTokens = new Set(tokenize(job.title));
  const titleHits = [...targetTokens].filter((t) => jobTitleTokens.has(t));

  const keywordTerms = new Set<string>();
  for (const term of [...keywords, ...resumeSkills]) {
    const clean = term.trim().toLowerCase();
    if (clean) keywordTerms.add(clean);
  }
  const haystack = `${job.title} ${job.description}`.toLowerCase();
  const keywordHits = [...keywordTerms].filter((term) =>
    termInText(haystack, term),
  );

  const titleScore = Math.min(1, titleHits.length / 2);
  const keywordScore = Math.min(1, keywordHits.length / 3);
  const locScore =
    locations.length === 0
      ? 0
      : locationMatches(job.location, locations)
        ? 1
        : 0;

  const score =
    APP_CONSTANTS.GREENHOUSE_TITLE_WEIGHT * titleScore +
    APP_CONSTANTS.GREENHOUSE_SKILL_WEIGHT * keywordScore +
    APP_CONSTANTS.GREENHOUSE_LOC_WEIGHT * locScore +
    recencyTiebreak(job.postedDate);

  return {
    score,
    components: {
      titleScore,
      keywordScore,
      locScore,
      titleHits,
      keywordHits,
    },
  };
}

// The relevance floor. Keep a job iff it has real signal:
//   >=1 target-title token match OR >=2 distinct keyword/skill hits.
// Tests presence (the component arrays), not the weighted magnitude, so it is
// invariant to weight tuning.
export function passesFloor(c: PrerankComponents): boolean {
  return (
    c.titleHits.length >= APP_CONSTANTS.GREENHOUSE_FLOOR_MIN_TITLE_HITS ||
    c.keywordHits.length >= APP_CONSTANTS.GREENHOUSE_FLOOR_MIN_KEYWORD_HITS
  );
}
