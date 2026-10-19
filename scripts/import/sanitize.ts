// Postgres text rejects NUL and lone surrogates; SQLite TEXT and JS strings
// accept both, and PDF extraction and scraped postings produce them.
const UNSTORABLE =
  /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function sanitizeString(value: string): string {
  return value.replace(UNSTORABLE, "");
}

export function sanitizeRow<T extends Record<string, unknown>>(
  row: T,
  onChange: (column: string) => void,
): T {
  let clean: Record<string, unknown> | null = null;
  for (const [column, value] of Object.entries(row)) {
    if (typeof value !== "string") continue;
    const next = sanitizeString(value);
    if (next === value) continue;
    clean ??= { ...row };
    clean[column] = next;
    onChange(column);
  }
  return (clean ?? row) as T;
}
