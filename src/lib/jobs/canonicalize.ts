// Deterministic canonical form used as the match key when resolving-or-creating
// Company / JobTitle / Location / JobSource. Shared by both entry points (the
// add_job path in resolve.ts and automation discovery in the scraper mapper) so
// identical input always resolves to the same record. Folds only variations
// that never change identity — case, diacritics, comma separators, and
// surrounding/repeated whitespace — plus, for companies, trailing legal
// suffixes like "Inc"/"LLC". Other punctuation is left intact so distinct
// labels such as "C++" vs "C#" can never collapse into one record.

const LEGAL_SUFFIXES = [
  "inc",
  "llc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "co",
  "company",
  "gmbh",
  "plc",
];

// Matches a single trailing legal-suffix token (optionally followed by a dot).
// Applied repeatedly so stacked suffixes ("Foo Inc Co") fully unwind.
const LEGAL_SUFFIX_RE = new RegExp(`\\s(?:${LEGAL_SUFFIXES.join("|")})\\.?$`);

export function canonicalizeEntityValue(
  label: string,
  opts: { stripLegalSuffix?: boolean } = {},
): string {
  const base = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!opts.stripLegalSuffix) return base;

  let value = base;
  let prev: string;
  do {
    prev = value;
    value = value.replace(LEGAL_SUFFIX_RE, "").trim();
  } while (value !== prev && value.length > 0);

  // Guard against a label that is nothing but a suffix (e.g. "Inc").
  return value.length > 0 ? value : base;
}
