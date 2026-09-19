// Task descriptions are Tiptap HTML, so an "empty" one is "" or "<p></p>"
const EXCERPT_MAX_LENGTH = 200;

export function toPlainText(html?: string | null): string {
  if (!html) return "";

  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasDescription(html?: string | null): boolean {
  return toPlainText(html).length > 0;
}

export function getDescriptionExcerpt(html?: string | null): string {
  const text = toPlainText(html);
  if (text.length <= EXCERPT_MAX_LENGTH) return text;

  return `${text.slice(0, EXCERPT_MAX_LENGTH).trimEnd()}…`;
}

export function plainTextToTiptapHtml(text?: string | null): string | null {
  if (text == null) return null;

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  return text
    .split(/\r?\n/)
    .map((line) => `<p>${line ? escapeHtml(line) : "<br>"}</p>`)
    .join("");
}
