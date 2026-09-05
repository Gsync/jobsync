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
