import { APP_CONSTANTS } from "@/lib/constants";
import { sanitizeString } from "@/lib/postgresText";
import { hasAnswer } from "@/lib/questions/answer";
import { normalizeQuestionText } from "@/lib/questions/similarity";
import type {
  BankQuestion,
  QuestionMatch,
  QuestionMergeMode,
  SaveQuestionInput,
  SaveQuestionResult,
} from "@/models/question.model";

export type PreparedQuestion = {
  index: number;
  question: string;
  answers: string[];
  tags: string[];
  notSameAs?: string[];
  mergeInto?: SaveQuestionInput["mergeInto"];
};

export type QuestionDecision =
  | { kind: "insert" }
  | { kind: "merge"; target: BankQuestion; mode: QuestionMergeMode }
  | { kind: "result"; result: SaveQuestionResult };

const {
  MIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MIN_QUESTION_ANSWER_LENGTH,
  MAX_QUESTION_ANSWER_LENGTH,
} = APP_CONSTANTS;

const FOREIGN_MERGE_ID =
  "That question id does not match this question. Send it again without mergeInto to see its matches.";

function lengthError(question: string, answer: string | undefined): string | undefined {
  if (question.length < MIN_QUESTION_LENGTH) return `question must be at least ${MIN_QUESTION_LENGTH} characters`;
  if (question.length > MAX_QUESTION_LENGTH) return `question cannot exceed ${MAX_QUESTION_LENGTH} characters`;
  if (answer === undefined) return undefined;
  if (answer.length < MIN_QUESTION_ANSWER_LENGTH) return `answer must be at least ${MIN_QUESTION_ANSWER_LENGTH} characters`;
  if (answer.length > MAX_QUESTION_ANSWER_LENGTH) return `answer cannot exceed ${MAX_QUESTION_ANSWER_LENGTH} characters`;
  return undefined;
}

function cleanAnswer(answer: string | undefined): string | undefined {
  const cleaned = sanitizeString(answer ?? "").trim();
  return hasAnswer(cleaned) ? cleaned : undefined;
}

export function prepareQuestions(items: SaveQuestionInput[]): {
  prepared: PreparedQuestion[];
  results: SaveQuestionResult[];
} {
  // Map keeps first-copy order when a repeat overwrites its entry
  const byText = new Map<string, PreparedQuestion>();
  const results: SaveQuestionResult[] = [];

  items.forEach((input, i) => {
    const index = i + 1;
    const question = sanitizeString(input.question).trim();
    const answer = cleanAnswer(input.answer);
    const error = lengthError(question, answer);
    if (error) {
      results.push({ index, question, status: "invalid", error, userFacing: true });
      return;
    }
    const answers = answer === undefined ? [] : [answer];
    const tags = input.tags ?? [];
    const key = normalizeQuestionText(question);
    const first = byText.get(key);
    if (first) {
      byText.set(key, { ...first, answers: [...first.answers, ...answers], tags: [...first.tags, ...tags] });
      results.push({ index, question, status: "repeat", of: first.index });
      return;
    }
    byText.set(key, { index, question, answers, tags, notSameAs: input.notSameAs, mergeInto: input.mergeInto });
  });

  return { prepared: [...byText.values()], results };
}

function invalid(item: PreparedQuestion, error: string): QuestionDecision {
  return { kind: "result", result: { index: item.index, question: item.question, status: "invalid", error } };
}

// A refused Replace leaves append as the only merge; its reason is for the user
function refused(item: PreparedQuestion, error: string): QuestionDecision {
  const result = { index: item.index, question: item.question, error };
  return { kind: "result", result: { ...result, status: "invalid", appendOnly: true, userFacing: true } };
}

// The write decision uses this too, so an offered Replace is never refused
export function canReplaceRow(row: BankQuestion, replaceAgentCreatedOnly: boolean): boolean {
  if (!hasAnswer(row.answer)) return false;
  return !replaceAgentCreatedOnly || row.createdVia !== null;
}

function heldCandidates(match: QuestionMatch, replaceAgentCreatedOnly: boolean) {
  return match.candidates.map((candidate, i) => ({
    ...candidate,
    canReplace: canReplaceRow(match.candidateRows[i], replaceAgentCreatedOnly),
  }));
}

function decideMerge(
  item: PreparedQuestion,
  match: QuestionMatch,
  replaceAgentCreatedOnly: boolean,
): QuestionDecision {
  const { questionId, mode } = item.mergeInto!;
  if (item.answers.length === 0) return invalid(item, "mergeInto needs an answer to add.");
  const allowed = [match.exact, ...match.candidateRows].filter((row) => row !== undefined);
  const target = allowed.find((row) => row.id === questionId);
  if (!target) return invalid(item, FOREIGN_MERGE_ID);
  if (mode === "replace" && !canReplaceRow(target, replaceAgentCreatedOnly)) {
    if (!hasAnswer(target.answer)) return refused(item, "This question has no saved answer to replace. Your answer can be added as its first answer instead.");
    return refused(item, "Only an answer added below the saved one is allowed for this app-created question.");
  }
  return { kind: "merge", target, mode };
}

export function decideQuestion(
  item: PreparedQuestion,
  match: QuestionMatch,
  options: { replaceAgentCreatedOnly: boolean },
): QuestionDecision {
  const base = { index: item.index, question: item.question };
  if (item.notSameAs?.length && item.mergeInto) {
    return invalid(item, "Send either notSameAs or mergeInto, not both.");
  }
  if (item.mergeInto) return decideMerge(item, match, options.replaceAgentCreatedOnly);
  if (match.exact) {
    const { id, question, answer } = match.exact;
    const canReplace = canReplaceRow(match.exact, options.replaceAgentCreatedOnly);
    if (item.answers.length === 0) {
      return { kind: "result", result: { ...base, status: "skipped", existing: { question } } };
    }
    return {
      kind: "result",
      result: { ...base, status: "exists", existing: { id, question, hasAnswer: hasAnswer(answer), canReplace } },
    };
  }
  if (match.candidates.length === 0) return { kind: "insert" };
  const rejected = new Set(item.notSameAs ?? []);
  if (match.candidates.every((c) => rejected.has(c.id))) return { kind: "insert" };
  const candidates = heldCandidates(match, options.replaceAgentCreatedOnly);
  const hasIncomingAnswer = item.answers.length > 0;
  return { kind: "result", result: { ...base, status: "similar", candidates, hasIncomingAnswer } };
}
