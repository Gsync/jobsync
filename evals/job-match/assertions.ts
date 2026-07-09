import { stripThinking } from '../../src/lib/ai/stripThinking';

type AssertionResult = { pass: boolean; score: number; reason: string };

// Mirrors src/lib/ai/jobMatch/parse.ts so the eval validates exactly what the
// runtime (stream util + automation runner) parses. The SCORES regex is kept
// local because parseJobMatch imports `@`-aliased modules that don't resolve in
// the promptfoo runtime; stripThinking is imported from src to avoid drift.
const SCORES_RE =
  /SCORES:\s*match=(\d+)\s+recommendation=(strong|good|partial|weak)/i;

// Anchored variant to assert SCORES is the very first line (the prompt demands
// it; the runtime parser tolerates it anywhere).
const SCORES_FIRST_RE =
  /^SCORES:\s*match=\d+\s+recommendation=(strong|good|partial|weak)/i;

type ParsedMatch = { matchScore: number; recommendation: string };

function parseMatch(output: string): { scores?: ParsedMatch; body: string } {
  const text = stripThinking(output);
  const match = text.match(SCORES_RE);
  const scores: ParsedMatch | undefined = match
    ? { matchScore: Number(match[1]), recommendation: match[2].toLowerCase() }
    : undefined;
  const body = (
    match ? text.replace(match[0], '') : text.replace(/^\s*SCORES:[^\n]*(\n|$)/i, '')
  ).replace(/^\s+/, '');
  return { scores, body };
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

export function assertScoresLine(output: string): AssertionResult {
  const { scores } = parseMatch(output);
  if (!scores) {
    return { pass: false, score: 0, reason: 'No valid SCORES: line found' };
  }
  if (Number.isNaN(scores.matchScore) || scores.matchScore > 100) {
    return { pass: false, score: 0, reason: `match out of range: ${scores.matchScore}` };
  }
  return {
    pass: true,
    score: 1,
    reason: `SCORES line present (match=${scores.matchScore} ${scores.recommendation})`,
  };
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

export function assertMarkdownBodyNonEmpty(output: string): AssertionResult {
  const { body } = parseMatch(output);
  if (body.length < 50) {
    return { pass: false, score: 0, reason: `Markdown body too short (${body.length} chars)` };
  }
  return { pass: true, score: 1, reason: 'Markdown analysis body present' };
}

export function assertRequiredSections(output: string): AssertionResult {
  const { body } = parseMatch(output);
  // Core sections that always apply (Deal Breakers is conditional, so not
  // required). Headings matched leniently against "## ..." lines.
  const required: { label: string; re: RegExp }[] = [
    { label: 'Summary', re: /^##\s+summary\b/im },
    { label: 'Requirements', re: /^##\s+requirements?\b/im },
    { label: 'Skills', re: /^##\s+skills?\b/im },
    { label: 'Experience', re: /^##\s+experience\b/im },
    { label: 'Keywords', re: /^##\s+keywords?\b/im },
    { label: 'Tailoring Tips', re: /^##\s+tailoring\s+tips?/im },
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

// The recommendation token must agree with the numeric match score's band
// (strong 80-100, good 65-79, partial 50-64, weak <50). A 3-pt tolerance
// absorbs boundary jitter without letting a wrong-band token through.
export function assertRecommendationConsistent(output: string): AssertionResult {
  const { scores } = parseMatch(output);
  if (!scores) {
    return { pass: false, score: 0, reason: 'No valid SCORES: line found' };
  }
  const { matchScore, recommendation } = scores;
  const bands: Record<string, [number, number]> = {
    strong: [80, 100],
    good: [65, 79],
    partial: [50, 64],
    weak: [0, 49],
  };
  const [lo, hi] = bands[recommendation];
  const ok = matchScore >= lo - 3 && matchScore <= hi + 3;
  return {
    pass: ok,
    score: ok ? 1 : 0,
    reason: ok
      ? `recommendation "${recommendation}" agrees with match=${matchScore}`
      : `recommendation "${recommendation}" (band ${lo}-${hi}) inconsistent with match=${matchScore}`,
  };
}

// Automation-match is the lean variant: SCORES line + a single "## Summary"
// section, with the 7-section deep analysis explicitly forbidden. This guards
// against the automation prompt drifting back into the full job-match output
// (which would bloat every unattended discovery-loop call).
export function assertAutomationSummaryOnly(output: string): AssertionResult {
  const { body } = parseMatch(output);
  if (!/^##\s+summary\b/im.test(body)) {
    return { pass: false, score: 0, reason: 'Missing "## Summary" section' };
  }
  const forbidden = ['Requirements', 'Skills', 'Experience', 'Keywords', 'Deal Breakers', 'Tailoring Tips'];
  const present = forbidden.filter((label) =>
    new RegExp(`^##\\s+${label.replace(/\s+/g, '\\s+')}\\b`, 'im').test(body),
  );
  if (present.length > 0) {
    return {
      pass: false,
      score: 0,
      reason: `Lean automation output must contain only Summary; found extra sections: ${present.join(', ')}`,
    };
  }
  return { pass: true, score: 1, reason: 'Only the "## Summary" section is present' };
}

// Fixture-specific score checks. The backend resume closely matches the backend
// JD (every must-have covered) and should score well; the marketing resume has
// none of the required backend skills and should score low. Thresholds carry a
// buffer for jitter while still tripping on a differentiation regression.

export function assertStrongMatchHigh(output: string): AssertionResult {
  const { scores } = parseMatch(output);
  if (!scores) {
    return { pass: false, score: 0, reason: 'No valid SCORES: line found' };
  }
  const ok = scores.matchScore >= 70 && ['strong', 'good'].includes(scores.recommendation);
  return {
    pass: ok,
    score: ok ? 1 : 0,
    reason: ok
      ? `strong fit scored well (match=${scores.matchScore} ${scores.recommendation})`
      : `expected match>=70 & strong/good, got match=${scores.matchScore} ${scores.recommendation}`,
  };
}

export function assertWeakMatchLow(output: string): AssertionResult {
  const { scores } = parseMatch(output);
  if (!scores) {
    return { pass: false, score: 0, reason: 'No valid SCORES: line found' };
  }
  const ok = scores.matchScore <= 40 && scores.recommendation === 'weak';
  return {
    pass: ok,
    score: ok ? 1 : 0,
    reason: ok
      ? `weak fit scored low (match=${scores.matchScore} ${scores.recommendation})`
      : `expected match<=40 & weak, got match=${scores.matchScore} ${scores.recommendation}`,
  };
}
