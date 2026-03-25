# ADR-007: useTranslations Locale Override for SSR Hydration

## Status
Accepted

## Context

The `useTranslations()` hook in `src/i18n/use-translations.ts` is a client component hook. Its default locale detection reads `document.documentElement.lang`, which is set by the root layout at render time:

```ts
// src/app/layout.tsx
const locale = await getUserLocale();
return <html lang={locale} ...>
```

This works correctly for client components rendered after the initial page load, where the DOM is available. However, during SSR and the initial hydration pass, `document` is not defined. The hook guards against this with:

```ts
typeof document !== "undefined" ? document.documentElement.lang : "en"
```

This means any client component that renders during SSR — including components on the auth pages, which are rendered before the session is established — would fall back to `"en"` regardless of the user's actual locale. On the auth pages specifically, this is observable: a German-speaking user who has set their locale via cookie would see English text on the sign-in page during the initial server render, then a flash to German on hydration.

## Decision

Server page components that render client components requiring locale during SSR pass the locale as an explicit prop. The server page resolves the locale authoritatively via `getUserLocale()` and threads it down to the first client component in the tree, which passes it to `useTranslations(localeOverride)`.

The concrete example is the auth flow:

```ts
// src/app/(auth)/signin/page.tsx  (Server Component)
const locale = await getUserLocale();
return <AuthCard mode="signin" locale={locale} />;

// src/components/auth/AuthCard.tsx  (Client Component)
export default function AuthCard({ locale }: { locale?: string }) {
  const { t } = useTranslations(locale);
  ...
}
```

`useTranslations()` accepts an optional `localeOverride` parameter. When provided it bypasses the `document.documentElement.lang` read entirely, so the correct locale is available on both the server render pass and the client hydration pass with no flash.

Components that only render after hydration (all dashboard routes) do not need the override because the DOM is available by the time they mount.

## Consequences

### Positive
- Eliminates locale flash on server-rendered pages that use client components (auth pages, any future public-facing pages).
- The server is the authoritative source of locale for the initial render; client and server agree from the first byte.
- No global context provider or prop-drilling through many layers is needed; the pattern is applied only where the mismatch actually occurs.

### Negative
- Server pages that render locale-dependent client components must remember to fetch and forward the locale prop; this is a convention, not enforced by the type system.
- Adds a `locale?: string` prop to affected client components, slightly widening their interface.

### Neutral
- The `localeOverride` parameter on `useTranslations()` is also available for testing purposes: test harnesses can supply a locale without setting up a DOM environment.
