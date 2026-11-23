import { mergeChoices } from "@/lib/questions/choices";
import type { HeldCandidate, QuestionTagReport, SaveQuestionResult } from "@/models/question.model";

type Merged = Extract<SaveQuestionResult, { status: "merged" }>;
type Similar = Extract<SaveQuestionResult, { status: "similar" }>;

const APPEND_ONLY =
  'Explain this reason to the user, ask whether to add their answer instead, and wait for their reply. If they agree, call add_question again with the same question and answer and mergeInto mode: "append".';

function tagSentences({ tags, droppedTags }: QuestionTagReport): { prefix: string; suffix: string } {
  const parts = tags.map((t) => `${t.created ? "Created" : "Matched"} ${t.label}`);
  const prefix = parts.length > 0 ? `${parts.join("; ")}. ` : "";
  const suffix = droppedTags.length > 0 ? ` Dropped tags exceeding limit: ${droppedTags.join(", ")}.` : "";
  return { prefix, suffix };
}

function describeCandidate(c: HeldCandidate, hasIncomingAnswer: boolean): string {
  const line = `- id ${c.id}: "${c.question}" (${c.hasAnswer ? "has an answer" : "no answer yet"}`;
  return hasIncomingAnswer ? `${line}; choices: ${mergeChoices(c).join(", ")})` : `${line})`;
}

function describeExists(existing: { id: string; hasAnswer: boolean; canReplace: boolean }): string {
  const bank = `Not saved: this question is already in the question bank (id: ${existing.id})`;
  if (!existing.hasAnswer) {
    return `${bank} with no answer yet. Ask the user whether to add their answer to it or skip it, then call add_question again with mergeInto: { questionId: "${existing.id}", mode: "append" } to add it.`;
  }
  if (!existing.canReplace) {
    return `${bank} and has an answer. Ask the user whether to add their answer below the saved one or skip it, then call add_question again with mergeInto: { questionId: "${existing.id}", mode: "append" } to add it.`;
  }
  return `${bank} and has an answer. Ask the user whether to add their answer below the saved one, replace the saved answer, or skip it, then call add_question again with mergeInto: { questionId: "${existing.id}", mode: "append" or "replace" }.`;
}

const SIMILAR_WITH_ANSWER =
  'Ask the user whether any of them is the same question. If one is, offer only the choices on its line, then call add_question again with mergeInto: { questionId, mode: "append" } to add the answer, or mode "replace" where replace is listed. Otherwise offer to save it as new, calling again with notSameAs listing every candidate id, or to skip it by leaving it out.';
const SIMILAR_WITHOUT_ANSWER =
  "The user gave no answer, so offer only to save it as new or skip it: to save it as new, call add_question again with notSameAs listing every candidate id; leave it out to skip it.";

function describeSimilar({ candidates, hasIncomingAnswer }: Similar): string {
  return [
    "Not saved yet: similar questions are already in the question bank:",
    ...candidates.map((c) => describeCandidate(c, hasIncomingAnswer)),
    hasIncomingAnswer ? SIMILAR_WITH_ANSWER : SIMILAR_WITHOUT_ANSWER,
  ].join("\n");
}

function describeMerge({ mode, savedQuestion, hadAnswer }: Merged): string {
  const target = `"${savedQuestion}"`;
  if (mode === "replace") return `replaced the saved answer of ${target}`;
  return hadAnswer ? `added the answer below the saved answer of ${target}` : `added the answer as the first answer of ${target}`;
}

export function describeQuestionResult(result: SaveQuestionResult): string {
  switch (result.status) {
    case "saved": {
      const { prefix, suffix } = tagSentences(result);
      return `${prefix}Question created.${suffix}`;
    }
    case "merged": {
      const { prefix, suffix } = tagSentences(result);
      return `${prefix}Merged (${result.mode}): ${describeMerge(result)}. The saved question keeps its wording.${suffix}`;
    }
    case "skipped":
      return "Already in the question bank; nothing was saved.";
    case "exists":
      return describeExists(result.existing);
    case "similar":
      return describeSimilar(result);
    case "repeat":
      return `Same question as #${result.of} in this call; folded into it.`;
    case "invalid":
      return `Not saved: ${result.error}${result.appendOnly ? ` ${APPEND_ONLY}` : ""}`;
    case "failed":
      return `Not saved: ${result.error}`;
  }
}
