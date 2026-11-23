import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { resolveTags, type ResolvedEntity } from "@/lib/jobs/resolve";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";
import { serializeByUser } from "@/lib/jobs/serializeByUser";
import { log } from "@/lib/telemetry";
import { hasAnswer, joinAnswerHtml, UNANSWERED_ANSWER } from "@/lib/questions/answer";
import { buildAnswerHtml } from "@/lib/questions/renderAnswer";
import { matchQuestion } from "@/lib/questions/similarity";
import { decideQuestion, prepareQuestions, type PreparedQuestion } from "@/lib/questions/decide";
import type {
  BankQuestion,
  QuestionMergeMode,
  SaveQuestionInput,
  SaveQuestionResult,
  SaveQuestionsOptions,
} from "@/models/question.model";

const { MAX_JOB_TAGS, MAX_QUESTION_ANSWER_LENGTH } = APP_CONSTANTS;

const FAILED = "Saving this question failed. Try it again.";

type WriteOutcome = { result: SaveQuestionResult; bank: BankQuestion[] };
type WriteDecision =
  | { kind: "insert" }
  | { kind: "merge"; target: BankQuestion; mode: QuestionMergeMode };

// The edit form validates stored HTML, so rendering must not push it over
function answerTooLong(html: string, joined: boolean): string | undefined {
  if (html.length <= MAX_QUESTION_ANSWER_LENGTH) return undefined;
  return joined
    ? `Adding this text would take the saved answer over ${MAX_QUESTION_ANSWER_LENGTH} characters. Try adding less text.`
    : `The answer would exceed ${MAX_QUESTION_ANSWER_LENGTH} characters once saved. Shorten it.`;
}

function storedAnswer(item: PreparedQuestion, decision: WriteDecision) {
  if (decision.kind === "insert") {
    const answer = item.answers.length ? buildAnswerHtml(item.answers) : UNANSWERED_ANSWER;
    return { answer, joined: false };
  }
  const added = buildAnswerHtml(item.answers);
  const { target, mode } = decision;
  const joined = mode === "append" && hasAnswer(target.answer);
  return { answer: joined ? joinAnswerHtml(target.answer!, added) : added, joined };
}

// resolveTag returns value and createdBy too; results carry only these
function tagReport(resolved: ResolvedEntity[]): ResolvedEntity[] {
  return resolved.map(({ id, label, created }) => ({ id, label, created }));
}

async function insertQuestion(
  item: PreparedQuestion,
  answer: string,
  context: { userId: string; createdVia: string },
): Promise<SaveQuestionResult> {
  const { userId, createdVia } = context;
  const { resolved, dropped } = await resolveTags(item.tags, userId, MAX_JOB_TAGS);
  await prisma.question.create({
    data: {
      question: item.question,
      answer,
      createdBy: userId,
      createdVia,
      tags: { connect: resolved.map((t) => ({ id: t.id })) },
    },
  });
  return { index: item.index, question: item.question, status: "saved", tags: tagReport(resolved), droppedTags: dropped };
}

// Tags already on the saved question do not use up its remaining slots
async function mergeQuestion(
  item: PreparedQuestion,
  answer: string,
  context: { userId: string; target: BankQuestion; mode: QuestionMergeMode },
): Promise<{ result: SaveQuestionResult; updated: BankQuestion }> {
  const { userId, target, mode } = context;
  const saved = new Set(target.tags.map((t) => t.value));
  const incoming = item.tags.filter((label) => !saved.has(canonicalizeEntityValue(label.trim())));
  const room = Math.max(0, MAX_JOB_TAGS - target.tags.length);
  const { resolved, dropped } = await resolveTags(incoming, userId, room);
  await prisma.question.update({
    where: { id: target.id, createdBy: userId },
    data: { answer, tags: { connect: resolved.map((t) => ({ id: t.id })) } },
  });
  const addedTags = resolved.map((t) => ({ id: t.id, value: canonicalizeEntityValue(t.label) }));
  return {
    result: {
      index: item.index,
      question: item.question,
      status: "merged",
      mode,
      savedQuestion: target.question,
      hadAnswer: hasAnswer(target.answer),
      tags: tagReport(resolved),
      droppedTags: dropped,
    },
    updated: { ...target, answer, tags: [...target.tags, ...addedTags] },
  };
}

async function write(
  item: PreparedQuestion,
  answer: string,
  context: { decision: WriteDecision; bank: BankQuestion[]; userId: string; createdVia: string },
): Promise<WriteOutcome> {
  const { decision, bank, userId, createdVia } = context;
  if (decision.kind === "insert") {
    return { result: await insertQuestion(item, answer, { userId, createdVia }), bank };
  }
  const { result, updated } = await mergeQuestion(item, answer, { userId, ...decision });
  // Later merges in this call build on the updated row
  return { result, bank: bank.map((row) => (row.id === updated.id ? updated : row)) };
}

async function saveOne(
  item: PreparedQuestion,
  bank: BankQuestion[],
  context: { userId: string; options: SaveQuestionsOptions; onWrite: () => void },
): Promise<WriteOutcome> {
  const { userId, options, onWrite } = context;
  const decision = decideQuestion(item, matchQuestion(item.question, bank), options);
  if (decision.kind === "result") return { result: decision.result, bank };
  const { answer, joined } = storedAnswer(item, decision);
  const tooLong = answerTooLong(answer, joined);
  if (tooLong) {
    const result = { index: item.index, question: item.question, error: tooLong };
    return { result: { ...result, status: "invalid", userFacing: true }, bank };
  }
  onWrite();
  try {
    return await write(item, answer, { decision, bank, userId, createdVia: options.createdVia });
  } catch (error) {
    log.error("[questions] save failed", { index: item.index, error: String(error) });
    return { result: { index: item.index, question: item.question, status: "failed", error: FAILED }, bank };
  }
}

function loadBank(userId: string): Promise<BankQuestion[]> {
  return prisma.question.findMany({
    where: { createdBy: userId },
    select: {
      id: true,
      question: true,
      answer: true,
      createdVia: true,
      tags: { select: { id: true, value: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export function saveQuestions(
  items: SaveQuestionInput[],
  userId: string,
  options: SaveQuestionsOptions,
): Promise<SaveQuestionResult[]> {
  const { prepared, results } = prepareQuestions(items);
  return serializeByUser(userId, async () => {
    options.onStep?.("duplicate");
    let bank = await loadBank(userId);
    let saveReported = false;
    const onWrite = () => {
      if (!saveReported) options.onStep?.("save");
      saveReported = true;
    };
    const written: SaveQuestionResult[] = [];
    for (const item of prepared) {
      const outcome = await saveOne(item, bank, { userId, options, onWrite });
      written.push(outcome.result);
      bank = outcome.bank;
    }
    return [...results, ...written].sort((a, b) => a.index - b.index);
  });
}
