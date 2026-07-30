import { stripThinking } from '../../src/lib/ai/stripThinking';

type AssertionResult = { pass: boolean; score: number; reason: string };
type Context = { vars: Record<string, string> };

// Mirrors src/utils/streamCoverLetter.utils.ts, which does exactly
// stripThinking(raw).trim() — there is nothing else to parse, the whole
// response is the letter as saved and rendered.
const clean = (output: string) => stripThinking(output).trim();

// The prompt asks for 250-400; the floor here is deliberately lower because a
// well-grounded letter with no prior match guidance lands around 226 words and
// reads fine. Outside the range but inside TOLERANCE scores partial so a mild
// drift is visible without failing the whole row to zero.
const MIN_WORDS = 220;
const MAX_WORDS = 400;
const TOLERANCE = 0.15;

export function assertNotJsonOrFenced(output: string): AssertionResult {
  const text = clean(output);
  if (text.startsWith('{') || text.startsWith('[')) {
    return { pass: false, score: 0, reason: 'Output looks like raw JSON; expected a markdown letter' };
  }
  if (text.startsWith('```')) {
    const fence = text.split('\n', 1)[0].slice(0, 40);
    return { pass: false, score: 0, reason: `Output is wrapped in a code fence: "${fence}"` };
  }
  return { pass: true, score: 1, reason: 'Output is a bare markdown letter' };
}

// A preamble ("Here is your cover letter:") or a date/address header would be
// saved verbatim and exported to PDF, so the first line must be the salutation.
export function assertStartsWithSalutation(output: string): AssertionResult {
  const firstLine = clean(output).split('\n', 1)[0].trim();
  if (!/^dear\s+\S.*$/i.test(firstLine)) {
    return {
      pass: false,
      score: 0,
      reason: `First line must be the salutation; got: "${firstLine.slice(0, 80)}"`,
    };
  }
  return { pass: true, score: 1, reason: 'Starts with the salutation' };
}

// Trailing commentary ("Let me know if you'd like...") is the mirror-image
// regression to a preamble, so anchor the end on the sign-off block.
export function assertSignOff(output: string): AssertionResult {
  const lines = clean(output).split('\n').map((l) => l.trim()).filter(Boolean);
  const tail = lines.slice(-3).join('\n');
  if (!/(sincerely|kind regards|best regards|regards)\s*,/i.test(tail)) {
    return {
      pass: false,
      score: 0,
      reason: `No sign-off in the last lines: "${tail.slice(-80)}"`,
    };
  }
  const last = lines[lines.length - 1];
  if (/^(let me know|i hope|please feel free|note:|p\.?s\.?[:.])/i.test(last)) {
    return { pass: false, score: 0, reason: `Commentary after the sign-off: "${last.slice(0, 80)}"` };
  }
  return { pass: true, score: 1, reason: 'Ends with a sign-off, no trailing commentary' };
}

export function assertCandidateNameSignature(output: string): AssertionResult {
  const tail = clean(output).split('\n').slice(-4).join('\n');
  if (!/jordan\s+ellis/i.test(tail)) {
    return {
      pass: false,
      score: 0,
      reason: `Sign-off must carry the resume's name (Jordan Ellis); got: "${tail.trim().slice(-80)}"`,
    };
  }
  return { pass: true, score: 1, reason: "Signed with the resume's candidate name" };
}

export function assertWordCount(output: string): AssertionResult {
  const words = clean(output).split(/\s+/).filter(Boolean).length;
  if (words >= MIN_WORDS && words <= MAX_WORDS) {
    return { pass: true, score: 1, reason: `${words} words (within ${MIN_WORDS}-${MAX_WORDS})` };
  }
  const lower = Math.floor(MIN_WORDS * (1 - TOLERANCE));
  const upper = Math.ceil(MAX_WORDS * (1 + TOLERANCE));
  const near = words >= lower && words <= upper;
  return {
    pass: false,
    score: near ? 0.5 : 0,
    reason: `${words} words, outside the ${MIN_WORDS}-${MAX_WORDS} range`,
  };
}

// "Do NOT include placeholder brackets like [Company]". Markdown links are
// excluded so a genuine [text](url) isn't flagged — letters shouldn't have
// them, but that's a style call, not this assertion's job.
export function assertNoPlaceholders(output: string): AssertionResult {
  const text = clean(output);
  const hits = [...text.matchAll(/\[([^\]\n]{1,60})\](?!\()/g)].map((m) => m[0]);
  if (hits.length > 0) {
    return {
      pass: false,
      score: 0,
      reason: `Unfilled placeholder brackets: ${hits.slice(0, 3).join(', ')}`,
    };
  }
  return { pass: true, score: 1, reason: 'No placeholder brackets' };
}

// Deterministic half of the fabrication check: every number in the letter must
// trace back to the resume, the job, or the match guidance. Catches invented
// metrics, years of experience, and dates — the fabrications that do real
// damage on a submitted application. Digit runs only, so "40 million" matches
// the resume's "40M+" and spelled-out numbers are ignored.
export function assertNoInventedNumbers(
  output: string,
  context: Context,
): AssertionResult {
  const numbersIn = (text: string) =>
    [...(text || '').matchAll(/\d+(?:[.,]\d+)*/g)].map((m) =>
      m[0].replace(/,/g, ''),
    );

  // "95K" and "95,000" are the same figure written two ways, so a source
  // number carrying a K/M/B suffix also allows its expanded form. This is not
  // the same as allowing derived numbers — the prompt forbids computing
  // percentages or totals, and those stay caught.
  const SUFFIX_SCALE: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };
  const scaledIn = (text: string) =>
    [...(text || '').matchAll(/(\d+(?:[.,]\d+)*)\s*([KkMmBb])\b/g)].map((m) =>
      String(Number(m[1].replace(/,/g, '')) * SUFFIX_SCALE[m[2].toLowerCase()]),
    );

  const allowed = new Set(
    [context.vars.resumeText, context.vars.jobDescription, context.vars.guidance]
      .filter(Boolean)
      .flatMap((source) => [...numbersIn(source), ...scaledIn(source)]),
  );

  const invented = [...new Set(numbersIn(clean(output)))].filter(
    (n) => !allowed.has(n),
  );

  if (invented.length > 0) {
    return {
      pass: false,
      score: 0,
      reason: `Numbers not present in the inputs: ${invented.slice(0, 5).join(', ')}`,
    };
  }
  return { pass: true, score: 1, reason: 'Every number traces to the inputs' };
}
