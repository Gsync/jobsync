// Postgres text rejects NUL and lone surrogates; PDF extraction, scraped
// postings and pasted text can all carry them.
const UNSTORABLE =
  /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function sanitizeString(value: string): string {
  return value.replace(UNSTORABLE, "");
}
