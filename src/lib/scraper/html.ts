// HTML helpers shared by ATS providers whose feeds return entity-encoded HTML.

const NAMED_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&amp;": "&", // keep ampersand last so it does not undo other entities
};

function decodeEntities(input: string): string {
  let out = input;
  // Numeric entities first (decimal + hex).
  out = out.replace(/&#(\d+);/g, (_, code) =>
    String.fromCodePoint(Number(code)),
  );
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCodePoint(parseInt(code, 16)),
  );
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    out = out.split(entity).join(char);
  }
  return out;
}

// Decode the entities back to real tags, strip the tags, then decode once more
// for any entities that lived inside the text, and collapse whitespace. Used
// for AI text processing.
export function flattenHtml(raw: string): string {
  if (!raw) return "";
  let text = decodeEntities(raw);
  text = text.replace(/<[^>]*>/g, " ");
  text = decodeEntities(text);
  return text.replace(/\s+/g, " ").trim();
}

// Decodes entity-encoded HTML back to real HTML tags for display rendering.
export function decodeHtml(raw: string): string {
  if (!raw) return "";
  const decoded = decodeEntities(raw);
  // Second pass decodes any entities inside tag attribute values
  return decodeEntities(decoded);
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "a",
  "span",
  "div",
  "hr",
]);

/**
 * Conservatively strips active content from a job description before it
 * reaches Tiptap. Tiptap already ignores unknown tags on parse, but the stored
 * value is also read by PDFs and AI prompts, so remove scripts, event handlers
 * and javascript: URLs here rather than relying on one renderer.
 */
export function sanitizeJobHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta)\b[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(
      /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta)\b[^>]*\/?>/gi,
      "",
    )
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(
      /\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi,
      ' $1="#"',
    )
    .replace(/\s(href|src)\s*=\s*javascript:[^\s>]*/gi, ' $1="#"')
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, name: string) =>
      ALLOWED_TAGS.has(name.toLowerCase()) ? tag : "",
    )
    .trim();
}

/** Wraps plain text in paragraphs so it can be stored as description HTML. */
export function textToHtml(text: string): string {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${paragraph
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}
