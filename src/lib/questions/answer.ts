// QuestionForm's default for a question with no answer yet
export const UNANSWERED_ANSWER = "TBD";

export const ANSWER_SEPARATOR = "<hr>";

// An untouched answer is still QuestionForm's "TBD" default, which the Tiptap
// editor may have wrapped in markup by the time it is saved.
export function hasAnswer(answer: string | null | undefined): boolean {
  const text = (answer ?? "").replace(/<[^>]*>/g, "").trim().toLowerCase();
  return text.length > 0 && text !== "tbd";
}

export function joinAnswerHtml(saved: string, added: string): string {
  return `${saved}${ANSWER_SEPARATOR}${added}`;
}
