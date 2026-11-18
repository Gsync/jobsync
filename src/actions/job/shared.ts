// Not a "use server" module: job/queries.ts and company/queries.ts both map
// job rows through this, and exporting it from either would make it an action.

import { isAnalyzedMatch } from "@/lib/ai/jobMatch/matchResult";

// An automation job saved without LLM analysis carries only its keyword
// pre-rank in matchScore, which the list must not show as an AI match. The
// matchData body is dropped so the list payload stays small.
export function hideUnanalyzedScore<
  T extends { matchScore: number | null; matchData: string | null },
>({ matchData, ...job }: T) {
  return isAnalyzedMatch(matchData) ? job : { ...job, matchScore: null };
}
