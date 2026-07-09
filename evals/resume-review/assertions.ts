import { stripThinking } from '../../src/lib/ai/stripThinking';

type AssertionResult = { pass: boolean; score: number; reason: string };

// Mirrors the client parsing in src/utils/streamResumeReview.utils.ts so the
// eval validates exactly what a user would see rendered. `stripThinking` is
// imported from src to avoid drift; the SCORES regex + body split are kept
// local because the runtime parser also does app-only work (clamping, fetch).

// Mirrors src/utils/streamResumeReview.utils.ts: match \d+ (not {1,3}) so an
// out-of-range score still parses instead of failing the whole line.
const SCORES_RE =
  /SCORES:\s*overall=(\d+)\s+impact=(\d+)\s+clarity=(\d+)\s+ats=(\d+)/i;

// Same fields, anchored to the start so we can assert SCORES is the very first
// line (the prompt demands it; the runtime parser tolerates it anywhere).
const SCORES_FIRST_RE =
  /^SCORES:\s*overall=\d+\s+impact=\d+\s+clarity=\d+\s+ats=\d+/i;

type ParsedScores = {
  overall: number;
  impact: number;
  clarity: number;
  ats: number;
};

function parseReview(output: string): { scores?: ParsedScores; body: string } {
  const text = stripThinking(output);
  const match = text.match(SCORES_RE);
  const scores: ParsedScores | undefined = match
    ? {
        overall: Number(match[1]),
        impact: Number(match[2]),
        clarity: Number(match[3]),
        ats: Number(match[4]),
      }
    : undefined;
  // Leading-only strip to match streamResumeReview.utils.ts (not .trim()).
  const body = (
    match
      ? text.replace(match[0], '')
      : text.replace(/^\s*SCORES:[^\n]*(\n|$)/i, '')
  ).replace(/^\s+/, '');
  return { scores, body };
}

export function assertScoresLine(output: string): AssertionResult {
  const { scores } = parseReview(output);
  if (!scores) {
    return { pass: false, score: 0, reason: 'No valid SCORES: line found' };
  }
  for (const [key, val] of Object.entries(scores)) {
    if (typeof val !== 'number' || Number.isNaN(val)) {
      return { pass: false, score: 0, reason: `score ${key} is not a number` };
    }
    // \d+ can't match a negative, so only the upper bound is reachable.
    if (val > 100) {
      return { pass: false, score: 0, reason: `score ${key} out of range: ${val}` };
    }
  }
  return { pass: true, score: 1, reason: 'SCORES line present, all values 0-100' };
}

export function assertScoresFirstLine(output: string): AssertionResult {
  const text = stripThinking(output).replace(/^\s+/, '');
  if (!SCORES_FIRST_RE.test(text)) {
    const firstLine = text.split('\n', 1)[0].slice(0, 80);
    return {
      pass: false,
      score: 0,
      reason: `SCORES must be the very first line; got: "${firstLine}"`,
    };
  }
  return { pass: true, score: 1, reason: 'SCORES is the first line' };
}

export function assertNotJson(output: string): AssertionResult {
  const trimmed = stripThinking(output).trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return { pass: false, score: 0, reason: 'Output looks like raw JSON; expected markdown' };
  }
  if (/^```(json)?\s*[{[]/i.test(trimmed)) {
    return { pass: false, score: 0, reason: 'Output is wrapped in a JSON code fence' };
  }
  return { pass: true, score: 1, reason: 'Output is markdown, not JSON' };
}

export function assertMarkdownBodyNonEmpty(output: string): AssertionResult {
  const { body } = parseReview(output);
  if (body.length < 50) {
    return { pass: false, score: 0, reason: `Markdown body too short (${body.length} chars)` };
  }
  return { pass: true, score: 1, reason: 'Markdown review body present' };
}

export function assertRequiredSections(output: string): AssertionResult {
  const { body } = parseReview(output);
  // Core sections that always apply (ATS / Grammar are conditional, so not
  // required here). Headings matched leniently against "## ..." lines.
  const required: { label: string; re: RegExp }[] = [
    { label: 'Summary', re: /^##\s+summary\b/im },
    { label: 'Top Improvements', re: /^##\s+top\s+improvements?/im },
    { label: 'Achievements', re: /^##\s+achievements?/im },
    { label: 'Keywords', re: /^##\s+keywords?/im },
    { label: 'Action Verbs', re: /^##\s+action\s+verbs?/im },
    { label: 'Section Feedback', re: /^##\s+section\s+feedback/im },
  ];
  const missing = required.filter((s) => !s.re.test(body)).map((s) => s.label);
  if (missing.length > 0) {
    return {
      pass: false,
      score: 1 - missing.length / required.length,
      reason: `Missing section headings: ${missing.join(', ')}`,
    };
  }
  return { pass: true, score: 1, reason: 'All core ## sections present' };
}

// Fixture-specific score checks. Thresholds are tuned to the model's observed
// spread (deepseek-chat, temp 0: strong overall=88 impact=95, weak overall=32
// impact=10) with a ~13-20pt buffer for jitter, wide enough to survive normal
// variance but tight enough that a differentiation regression trips them.

export function assertStrongScoresHigh(output: string): AssertionResult {
  const { scores } = parseReview(output);
  if (!scores) {
    return { pass: false, score: 0, reason: 'No valid SCORES: line found' };
  }
  const ok = scores.overall >= 75 && scores.impact >= 80;
  return {
    pass: ok,
    score: ok ? 1 : 0,
    reason: ok
      ? `strong resume scored well (overall=${scores.overall} impact=${scores.impact})`
      : `strong resume overall>=75/impact>=80 expected, got overall=${scores.overall} impact=${scores.impact}`,
  };
}

export function assertWeakScoresLow(output: string): AssertionResult {
  const { scores } = parseReview(output);
  if (!scores) {
    return { pass: false, score: 0, reason: 'No valid SCORES: line found' };
  }
  const ok = scores.overall <= 50 && scores.impact <= 30;
  return {
    pass: ok,
    score: ok ? 1 : 0,
    reason: ok
      ? `weak resume scored low (overall=${scores.overall} impact=${scores.impact})`
      : `weak resume overall<=50/impact<=30 expected, got overall=${scores.overall} impact=${scores.impact}`,
  };
}
