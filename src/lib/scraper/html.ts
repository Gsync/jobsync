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

const BLOCK_TAG_END =
  /<\s*\/\s*(?:p|div|li|h[1-6]|tr|section|article|blockquote|pre|ul|ol|table|header|footer)\s*>/gi;
const LINE_BREAK = /<\s*br\s*\/?\s*>/gi;
const LIST_ITEM_START = /<\s*li\b[^>]*>/gi;
const SCRIPT_BLOCK = /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi;
const STYLE_BLOCK = /<\s*style\b[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi;
const NOSCRIPT_BLOCK = /<\s*noscript\b[^>]*>[\s\S]*?<\s*\/\s*noscript\s*>/gi;
const SVG_BLOCK = /<\s*svg\b[^>]*>[\s\S]*?<\s*\/\s*svg\s*>/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

// Converts a job posting's HTML description to readable plain text. Unlike
// flattenHtml, this keeps paragraph/list structure because the result is
// stored as the job description and rendered through markdown-it — stripping
// every newline would turn a posting into one giant paragraph.
export function htmlToText(raw: string): string {
  if (!raw) return "";

  let text = raw
    .replace(SCRIPT_BLOCK, " ")
    .replace(STYLE_BLOCK, " ")
    .replace(NOSCRIPT_BLOCK, " ")
    .replace(SVG_BLOCK, " ")
    .replace(HTML_COMMENT, " ");

  text = decodeEntities(text);
  text = text
    .replace(LINE_BREAK, "\n")
    .replace(LIST_ITEM_START, "- ")
    .replace(BLOCK_TAG_END, "\n")
    .replace(/<[^>]*>/g, " ");

  // Entities can live inside text that was hidden behind tags before the
  // first decode, so decode once more now that the tags are gone.
  text = decodeEntities(text);

  return text
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
