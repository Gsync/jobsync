import MarkdownIt from "markdown-it";
import { ANSWER_SEPARATOR } from "@/lib/questions/answer";

// html:false escapes any raw HTML in the input; TipTapContentViewer further
// strips unrecognized tags, so the stored/rendered answer is safe.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

export function renderAnswerMarkdown(markdown: string): string {
  return md.render(markdown);
}

export function buildAnswerHtml(answers: string[]): string {
  return answers.map(renderAnswerMarkdown).join(ANSWER_SEPARATOR);
}
