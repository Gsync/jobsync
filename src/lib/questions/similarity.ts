import { APP_CONSTANTS } from "@/lib/constants";
import { hasAnswer } from "@/lib/questions/answer";
import type { BankQuestion, QuestionMatch } from "@/models/question.model";

// Punctuation is kept so "C++" and "C#" stay distinct questions
export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?.!]$/, "")
    .trimEnd();
}

function trigrams(text: string): Set<string> {
  if (text.length < 3) return new Set([text]);
  const set = new Set<string>();
  for (let i = 0; i <= text.length - 3; i++) set.add(text.slice(i, i + 3));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared++;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

export function trigramSimilarity(a: string, b: string): number {
  return jaccard(
    trigrams(normalizeQuestionText(a)),
    trigrams(normalizeQuestionText(b)),
  );
}

export function matchQuestion(text: string, bank: BankQuestion[]): QuestionMatch {
  const normalized = normalizeQuestionText(text);
  const grams = trigrams(normalized);
  const exact = bank.find((row) => normalizeQuestionText(row.question) === normalized);
  const scored = bank
    .filter((row) => normalizeQuestionText(row.question) !== normalized)
    .map((row) => ({ row, score: jaccard(grams, trigrams(normalizeQuestionText(row.question))) }))
    .filter(({ score }) => score >= APP_CONSTANTS.QUESTION_SIMILARITY_FLOOR)
    .sort((a, b) => b.score - a.score || (a.row.id < b.row.id ? -1 : 1))
    .slice(0, APP_CONSTANTS.QUESTION_CANDIDATE_LIMIT);
  return {
    exact,
    candidates: scored.map(({ row, score }) => ({
      id: row.id,
      question: row.question,
      score: Math.round(score * 100) / 100,
      hasAnswer: hasAnswer(row.answer),
    })),
    candidateRows: scored.map(({ row }) => row),
  };
}
