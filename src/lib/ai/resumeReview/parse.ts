import type { ResumeScores } from "@/models/ai.schemas";
import { stripThinking } from "@/lib/ai/stripThinking";

// Isomorphic parser shared by the client stream util and the MCP save
// handler. No `server-only`, no `fetch` — pure text -> result.

export type ResumeReviewResult = {
  scores?: ResumeScores;
  // Markdown review body (scores line and any <think> blocks stripped out).
  body: string;
};

// Match greedily on digits (not {1,3}) so an out-of-range value like 1000
// still parses — clamp() below brings it back into 0-100 rather than failing
// the whole line and dropping every score.
const SCORES_RE =
  /SCORES:\s*overall=(\d+)\s+impact=(\d+)\s+clarity=(\d+)\s+ats=(\d+)/i;

export function parseResumeReview(raw: string): ResumeReviewResult {
  const text = stripThinking(raw);
  const match = text.match(SCORES_RE);

  let scores: ResumeScores | undefined;
  if (match) {
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    scores = {
      overall: clamp(Number(match[1])),
      impact: clamp(Number(match[2])),
      clarity: clamp(Number(match[3])),
      atsCompatibility: clamp(Number(match[4])),
    };
  }

  // Remove the scores line from the body. Before it has fully streamed, also
  // hide a leading partial "SCORES:" line so it doesn't flash in the markdown.
  let body = match
    ? text.replace(match[0], "")
    : text.replace(/^\s*SCORES:[^\n]*(\n|$)/i, "");
  body = body.replace(/^\s+/, "");

  return { scores, body };
}
