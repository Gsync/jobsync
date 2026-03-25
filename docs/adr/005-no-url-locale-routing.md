# ADR-005: No URL-Based Locale Routing

## Status
Accepted

## Context

Next.js supports locale routing via URL prefixes (e.g. `/de/dashboard`, `/fr/dashboard`). This is the idiomatic approach when an application needs SEO-indexed multilingual content, as search engines treat each locale URL as a distinct indexable resource.

JobSync is fully auth-gated: every route under `/dashboard` requires an authenticated session. The sign-in and sign-up pages are the only publicly accessible routes. There is no requirement for search engines to index translated content, and there is no marketing site served from the same Next.js instance.

URL-prefix routing would also require either middleware-based locale detection on every request or explicit locale segments in all `<Link>` components and `router.push()` calls throughout the codebase. For a single-user self-hosted tracker this complexity has no payoff.

## Decision

Derive the user's locale entirely from application state, not from the URL. The resolution order is implemented in `src/lib/locale.ts` via `getUserLocale()`:

1. Authenticated user's `settings.locale` field in the database (highest priority).
2. `NEXT_LOCALE` cookie (set when the user changes their language in Settings; persists across sessions before the DB record is updated).
3. Default locale `"en"` (fallback).

The root layout (`src/app/layout.tsx`) calls `getUserLocale()` at render time and writes the result to `<html lang={locale}>`. This single attribute is the authoritative locale signal for the entire client-side rendering tree; the `useTranslations()` hook reads it via `document.documentElement.lang`.

EU API proxy routes (`/api/esco/*`, `/api/eures/*`) use `getLocaleFromCookie()` — the cookie-only variant — because they may run outside a full page render where the DB lookup is unnecessary.

## Consequences

### Positive
- Zero routing infrastructure: no `i18n` block in `next.config.js`, no middleware, no locale-prefixed `<Link>` components.
- Language changes take effect immediately on the next page load without a URL change or redirect.
- The locale is user-scoped, not session-scoped: a user who sets German once gets German on any device after next login.

### Negative
- Locale is not bookmarkable or shareable via URL; a shared link always renders in the recipient's locale, not the sender's.
- No SEO benefit for multilingual content (not a current requirement, but forecloses future public-facing pages without a routing refactor).

### Neutral
- The `NEXT_LOCALE` cookie name matches Next.js's own locale cookie convention, which simplifies any future migration to built-in i18n routing if requirements change.
