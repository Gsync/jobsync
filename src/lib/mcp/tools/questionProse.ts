import type { QuestionCandidate, QuestionTagReport, SaveQuestionResult } from "@/models/question.model";

const APPEND_ONLY =
  'Only append is allowed for this question. Ask the user whether to append instead, then call add_question again with the same question and answer and mergeInto mode: "append".';

function tagSentences({ tags, droppedTags }: QuestionTagReport): { prefix: string; suffix: string } {
  const parts = tags.map((t) => `${t.created ? "Created" : "Matched"} ${t.label}`);
  const prefix = parts.length > 0 ? `${parts.join("; ")}. ` : "";
  const suffix = droppedTags.length > 0 ? ` Dropped tags exceeding limit: ${droppedTags.join(", ")}.` : "";
  return { prefix, suffix };
}

function describeCandidate(c: QuestionCandidate): string {
  return `- id ${c.id}: "${c.question}" (${c.hasAnswer ? "has an answer" : "no answer yet"})`;
}

function describeExists(existing: { id: string; hasAnswer: boolean }): string {
  if (!existing.hasAnswer) {
    return `Not saved: this question is already in the question bank (id: ${existing.id}) with no answer yet. Ask the user whether to add their answer to it or skip it, then call add_question again with mergeInto: { questionId: "${existing.id}", mode: "append" } to add it.`;
  }
  return `Not saved: this question is already in the question bank (id: ${existing.id}) and has an answer. Ask the user whether to append their answer below the saved one, replace the saved one, or skip it, then call add_question again with mergeInto: { questionId: "${existing.id}", mode: "append" or "replace" }.`;
}

function describeSimilar(candidates: QuestionCandidate[]): string {
  return [
    "Not saved yet: similar questions are already in the question bank:",
    ...candidates.map(describeCandidate),
    "Ask the user whether any of them is the same question. Then call add_question again: with mergeInto: { questionId, mode: \"append\" or \"replace\" } to add the user's answer to one of them (only when the user gave an answer), or with notSameAs listing the ids that are not the same question to save it as new. Leave the question out to skip it.",
  ].join("\n");
}

export function describeQuestionResult(result: SaveQuestionResult): string {
  switch (result.status) {
    case "saved": {
      const { prefix, suffix } = tagSentences(result);
      return `${prefix}Question created.${suffix}`;
    }
    case "merged": {
      const { prefix, suffix } = tagSentences(result);
      const how = result.mode === "append" ? "answer appended below the saved one" : "saved answer replaced";
      return `${prefix}Merged into the saved question (${result.mode}: ${how}).${suffix}`;
    }
    case "skipped":
      return "Already in the question bank; nothing was saved.";
    case "exists":
      return describeExists(result.existing);
    case "similar":
      return describeSimilar(result.candidates);
    case "repeat":
      return `Same question as #${result.of} in this call; folded into it.`;
    case "invalid":
      return `Not saved: ${result.error}${result.appendOnly ? ` ${APPEND_ONLY}` : ""}`;
    case "failed":
      return `Not saved: ${result.error}`;
  }
}
