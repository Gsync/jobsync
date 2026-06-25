type AssertionResult = { pass: boolean; score: number; reason: string };

// Mirrors the client parsing in src/utils/streamResumeReview.utils.ts so the
// eval validates exactly what a user would see rendered.

// Mirrors src/utils/streamResumeReview.utils.ts: match \d+ (not {1,3}) so an
// out-of-range score still parses instead of failing the whole line.
const SCORES_RE =
  /SCORES:\s*overall=(\d+)\s+impact=(\d+)\s+clarity=(\d+)\s+ats=(\d+)/i;

type ParsedScores = {
  overall: number;
  impact: number;
  clarity: number;
  ats: number;
};

function stripThinking(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const openIdx = out.search(/<think>/i);
  if (openIdx !== -1) out = out.slice(0, openIdx);
  return out;
}

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
  const body = (
    match
      ? text.replace(match[0], '')
      : text.replace(/^\s*SCORES:[^\n]*(\n|$)/i, '')
  ).trim();
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
    if (val < 0 || val > 100) {
      return { pass: false, score: 0, reason: `score ${key} out of range: ${val}` };
    }
  }
  return { pass: true, score: 1, reason: 'SCORES line present, all values 0-100' };
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
