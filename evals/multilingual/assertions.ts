import { stripThinking } from '../../src/lib/ai/stripThinking';

type AssertionResult = { pass: boolean; score: number; reason: string };
type Context = { vars: Record<string, string> };

// Small function-word lists. Function words are the cheapest reliable language
// signal: they are frequent in any prose, and a few dozen per language is
// enough to tell fr/en/es/de/pt/it apart on a paragraph of output.
const STOPWORDS: Record<string, string[]> = {
  en: ['the', 'and', 'of', 'to', 'with', 'for', 'is', 'in', 'that', 'this', 'are', 'has', 'have', 'on', 'as', 'by', 'from'],
  fr: ['le', 'la', 'les', 'des', 'de', 'du', 'et', 'est', 'une', 'un', 'pour', 'avec', 'dans', 'que', 'qui', 'sur', 'au', 'aux', 'par', 'ses', 'son'],
  es: ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'es', 'una', 'un', 'para', 'con', 'en', 'que', 'por', 'su', 'sus'],
  de: ['der', 'die', 'das', 'und', 'ist', 'mit', 'für', 'von', 'zu', 'den', 'dem', 'ein', 'eine', 'auf', 'im', 'sie'],
  pt: ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'e', 'é', 'um', 'uma', 'para', 'com', 'em', 'que', 'por', 'seu', 'sua'],
  it: ['il', 'lo', 'la', 'gli', 'di', 'del', 'e', 'è', 'un', 'una', 'per', 'con', 'in', 'che', 'su', 'dei', 'delle'],
};

// Machine-parsed lines are English by design, and quoted resume/job phrases
// stay in the source language, so strip the former before scoring.
function prose(output: string): string {
  return stripThinking(output)
    .replace(/^\s*SCORES:[^\n]*$/gim, '')
    .replace(/^#{1,6}\s.*$/gm, '')
    .toLowerCase();
}

function share(text: string, lang: string): number {
  const words = text.match(/\p{L}+/gu) ?? [];
  if (words.length === 0) return 0;
  const set = new Set(STOPWORDS[lang]);
  return words.filter((w) => set.has(w)).length / words.length;
}

// Passes when the expected language's function words clearly outnumber every
// other language's. Scored on ratios, not a threshold, so it works whatever
// the output length is.
export function assertLanguage(output: string, context: Context): AssertionResult {
  const expected = context.vars.expectedLanguage;
  const text = prose(output);
  const scores = Object.keys(STOPWORDS).map((lang) => [lang, share(text, lang)] as const);
  const best = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
  const own = share(text, expected);
  if (best[0] !== expected || own === 0) {
    return {
      pass: false,
      score: 0,
      reason: `Expected ${expected} but ${best[0]} dominates (${scores.map(([l, s]) => `${l}=${s.toFixed(3)}`).join(', ')})`,
    };
  }
  return { pass: true, score: 1, reason: `Output is ${expected} (${own.toFixed(3)} function-word share)` };
}

// The parsers key on these, so a localized token silently breaks parsing.
export function assertParsedTokensEnglish(output: string): AssertionResult {
  const text = stripThinking(output).trim();
  if (!/^SCORES:\s*\w+=/i.test(text)) {
    return { pass: false, score: 0, reason: 'Missing English SCORES line at the start' };
  }
  const headings = (text.match(/^##\s.*$/gm) ?? []).map((h) => h.replace(/^##\s*/, ''));
  const known = ['Summary', 'Requirements', 'Skills', 'Experience', 'Keywords', 'Deal Breakers', 'Tailoring Tips'];
  if (!headings.some((h) => known.includes(h.trim()))) {
    return { pass: false, score: 0, reason: `No English section headings found; got: ${headings.join(' | ')}` };
  }
  return { pass: true, score: 1, reason: 'SCORES line and headings are English' };
}

// A letter in the posting's language must not open or close in English.
export function assertLocalizedLetterFraming(output: string, context: Context): AssertionResult {
  if (context.vars.expectedLanguage === 'en') return { pass: true, score: 1, reason: 'English letter' };
  const text = stripThinking(output).trim();
  if (/^dear\s/i.test(text) || /\n\s*(sincerely|best regards|kind regards)\s*,/i.test(text)) {
    return { pass: false, score: 0, reason: 'Salutation or sign-off was left in English' };
  }
  return { pass: true, score: 1, reason: 'Salutation and sign-off are localized' };
}
