# ADR-001: Dictionary-Based i18n over LinguiJS Macros

## Status
Accepted

## Context

JobSync requires multilingual support across 4 locales (EN, DE, FR, ES) covering ~496 translation keys. LinguiJS was the initial candidate because its macro syntax (`` t`Dashboard` ``) enables static extraction of translation strings from source code into PO files without manual key management.

However, the `@lingui/swc-plugin` is incompatible with Next.js 15.5. The SWC plugin that transforms Lingui macro calls at compile time does not support the version of the SWC transform pipeline that Next.js 15.5 uses. Forcing the older plugin causes build failures and blocks the upgrade path.

The app is auth-gated with no SEO requirements, so neither server-side rendering of translated content for crawlers nor build-time extraction of strings is a hard constraint.

## Decision

Use a custom dictionary-based i18n system with an **adapter pattern** that preserves a migration path to LinguiJS macros when plugin support catches up.

The implementation is split across two barrel modules:
- `src/i18n/index.ts` — client-safe exports (`useTranslations`, formatters, locale utilities)
- `src/i18n/server.ts` — server-only exports (`t`, `getUserLocale`, `getLocaleFromCookie`)

Translation keys use `namespace.camelCaseKey` notation (e.g. `jobs.addNote`). Dictionaries are flat objects per locale, merged from namespace files in `src/i18n/dictionaries/` via `mergeDictionaries()` in `src/i18n/dictionaries.ts`.

The `useTranslations()` hook and `t(locale, key)` function expose an API surface compatible with future LinguiJS adoption: only the internal implementation changes, consumer code does not.

## Consequences

### Positive
- Unblocks Next.js 15.5 adoption immediately.
- Type-safe translation keys via `TranslationKey = string` with key-miss fallback (returns the key itself).
- Single import point per environment prevents accidental server-only imports in client components.
- Adapter pattern means component rewrites are not needed when LinguiJS support arrives.

### Negative
- Translation keys must be maintained manually in 4 locale files simultaneously; there is no auto-extraction from source.
- No compile-time validation that a key exists in all locales; missing keys surface only at runtime as the raw key string.
- PO-file tooling (Crowdin, Weblate) is unavailable until migration to LinguiJS.

### Neutral
- `src/i18n/lingui.ts` exists as scaffolding for the future LinguiJS path; it is not used by any consumer today.
- Adding a fifth locale requires editing 10 files (9 namespace dictionaries + `locales.ts` + `formatters.ts`).
