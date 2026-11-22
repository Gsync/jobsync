import {
  buildLlmMatchData, buildPrerankMatchData, isAnalyzedMatch, parseMatchData,
  UNANALYZED_MATCH_FILTER, UNANALYZED_MATCH_MARKER,
} from "@/lib/ai/jobMatch/matchResult";

const prerank = {
  prerankScore: 0.4,
  prerankComponents: { titleScore: 1, keywordScore: 0, locScore: 0, titleHits: ["engineer"], keywordHits: [] },
};
const scores = { matchScore: 80, recommendation: "good match" } as const;
const matchedAt = new Date("2026-11-16T12:00:00Z");

it("writes the exact substring used to filter unanalyzed rows", () => {
  const raw = buildPrerankMatchData(prerank);
  expect(raw).toContain(UNANALYZED_MATCH_MARKER);
  expect(UNANALYZED_MATCH_FILTER.matchData.contains).toBe(UNANALYZED_MATCH_MARKER);
  expect(parseMatchData(raw)).toEqual({ ...prerank, analyzed: false });
  expect(isAnalyzedMatch(raw)).toBe(false);
  expect(isAnalyzedMatch(JSON.stringify({ ...prerank, analyzed: false }))).toBe(false);
});

it("round-trips the supplied match and provenance", () => {
  const raw = buildLlmMatchData({
    scores, body: "x", matchedAt, resume: { id: "r", title: "Resume" },
    provider: "ollama", model: "model", surface: "chat", descriptionCompleteness: "full", prerank,
  });
  expect(raw).not.toContain(UNANALYZED_MATCH_MARKER);
  expect(parseMatchData(raw)).toEqual({
    ...scores, body: "x", matchedAt: matchedAt.toISOString(), analyzed: true,
    resumeId: "r", resumeTitle: "Resume", provider: "ollama", model: "model",
    surface: "chat", descriptionCompleteness: "full", ...prerank,
  });
  expect(parseMatchData(buildLlmMatchData({ scores, body: "x", matchedAt }))).toEqual({
    ...scores, body: "x", matchedAt: matchedAt.toISOString(), analyzed: true,
  });
});

it.each([null, undefined, "", "not json", "[1]", '"text"', "null", "0"])(
  "handles a missing or invalid match object (%s)", (raw) => {
    expect(parseMatchData(raw)).toBeNull();
    expect(isAnalyzedMatch(raw)).toBe(true);
  },
);

it.each(["{}", '{"matchScore":80,"body":"x"}'])("treats legacy rows as analyzed (%s)", (raw) => {
  expect(isAnalyzedMatch(raw)).toBe(true);
});
