# ADR-006: || Separator for Keywords, Comma for Locations

## Status
Accepted

## Context

The EURES search API accepts multiple keyword objects and multiple location codes in a single request. JobSync stores these as single strings in the `Automation` aggregate fields `keywords` and `location`, then splits them at search time before constructing the API payload.

Two different separators are needed because the two fields have different value characteristics:

- **Location codes** are short, unambiguous NUTS codes and country codes (e.g. `DE`, `DE-NS`, `FR`). Commas are safe because location codes never contain commas.
- **Keywords** are free-text job titles and skill terms entered by users (e.g. `Senior Software Engineer`, `React, TypeScript`). Commas appear naturally inside individual keyword phrases, particularly in skill lists. Using a comma as the keyword separator would silently split `"React, TypeScript"` into two separate keywords — `"React"` and `"TypeScript"` — changing search semantics without user awareness.

The EURES connector (`src/lib/connector/job-discovery/modules/eures/index.ts`) splits these fields as follows:

```ts
// Keywords: split on ||
params.keywords.split("||").map((k) => k.trim()).filter(Boolean)

// Locations: split on ,
params.location.split(",").map((c) => c.trim())
```

## Decision

Use `||` (double pipe) as the separator between distinct keyword entries, and `,` (comma) as the separator between location codes.

This asymmetry is intentional: `||` does not appear in natural job title text, eliminating the ambiguity that a comma would create. Location codes are machine-generated identifiers where commas are unambiguous delimiters.

The Automation creation UI must present `||` to users as the keyword separator with appropriate labelling (e.g. "separate multiple keywords with ||").

## Consequences

### Positive
- Eliminates silent mis-splitting of keyword phrases that contain commas (common in skill-based searches).
- Location codes remain readable and editable in raw form since commas are the natural list separator for short codes.
- The separator choice is visible in stored data, making the intent self-documenting.

### Negative
- `||` is an unusual separator that requires explanation in the UI; users familiar with comma-separated inputs may be surprised.
- If a future connector uses a different internal separator convention, the split logic in that Module must handle the `||` input format consistently.

### Neutral
- The stored format is connector-agnostic: `runner.ts` passes the raw strings to each Module's `search()`, and each Module is responsible for interpreting them. The EURES Module is currently the only one that performs this split; other Modules may treat the full string as a single query.
