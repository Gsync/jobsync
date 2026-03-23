# Internationalization (i18n)

## Architecture

JobSync uses a **dictionary-based i18n system** with type-safe translation keys.

```
User Settings (DB)
  └─ locale: "de"
       ├─► <html lang="de"> (root layout)
       ├─► useTranslations() hook → reads locale from html lang
       ├─► t(locale, key) → for server components
       └─► NEXT_LOCALE cookie → for API routes
```

## Imports

All i18n functionality is accessed through **two barrel modules**:

```ts
// Client Components (no server-only code):
import { useTranslations, formatDate, formatNumber, SUPPORTED_LOCALES } from "@/i18n";

// Server Components, Actions, API Routes:
import { t, getUserLocale, getLocaleFromCookie, formatDate } from "@/i18n/server";
```

**Never import from internal modules directly** (`@/i18n/dictionaries`, `@/i18n/use-translations`, `@/lib/formatters`, `@/lib/locale`).

## How to Add Translations

### 1. Add the key to the namespace dictionary

Add to the appropriate file in `src/i18n/dictionaries/` (or `dictionaries.ts` for core keys):

```ts
// In dictionaries/myfeature.ts — all 4 locales:
"myFeature.title": "My Feature",      // en
"myFeature.title": "Mein Feature",    // de
"myFeature.title": "Ma fonctionnalité", // fr
"myFeature.title": "Mi función",      // es
```

Then import the namespace in `src/i18n/dictionaries.ts` and add to `mergeDictionaries()`.

### 2. Use in Client Components

```tsx
import { useTranslations, formatDateShort } from "@/i18n";

function MyComponent() {
  const { t, locale } = useTranslations();
  return (
    <div>
      <h1>{t("myFeature.title")}</h1>
      <span>{formatDateShort(new Date(), locale)}</span>
    </div>
  );
}
```

### 3. Use in Server Components

```tsx
import { t, getUserLocale, formatDateShort } from "@/i18n/server";

async function MyServerComponent() {
  const locale = await getUserLocale();
  return (
    <div>
      <h1>{t(locale, "myFeature.title")}</h1>
      <span>{formatDateShort(new Date(), locale)}</span>
    </div>
  );
}
```

### 4. Use in API Routes

```ts
import { getLocaleFromCookie } from "@/i18n/server";

export async function GET() {
  const locale = await getLocaleFromCookie();
  // Pass locale to external APIs
}
```

## Key Naming Convention

Use dot-separated namespaces:
- `nav.*` — Navigation (sidebar, header)
- `auth.*` — Authentication (signin, signup)
- `settings.*` — Settings page
- `profile.*` — Profile dropdown
- `common.*` — Shared strings (Save, Cancel, Error, etc.)
- `dashboard.*` — Dashboard page
- `jobs.*` — Jobs features
- `automations.*` — Automation features

## Adding a New Language

1. Add the locale to `src/i18n/locales.ts` → `SUPPORTED_LOCALES`
2. Add a new object in `src/i18n/dictionaries.ts` with all keys translated
3. The language will appear in Settings → Display → Language

## Supported Locales

| Code | Language | Flag |
|------|----------|------|
| en   | English  | 🇬🇧  |
| de   | Deutsch  | 🇩🇪  |
| fr   | Français | 🇫🇷  |
| es   | Español  | 🇪🇸  |

## Locale-Aware Formatting

All dates, numbers, and currencies use locale-aware formatters from `src/lib/formatters.ts`.

### Date Formatting

```tsx
import { formatDateShort, formatDateTime, formatTime } from "@/lib/formatters";

// In client components:
const { locale } = useTranslations();
formatDateShort(new Date(), locale);  // "Mar 23, 2026" (en) / "23. März 2026" (de)
formatDateTime(new Date(), locale);   // "Mar 23, 2:30 PM" (en) / "23. März, 14:30" (de)
formatTime(new Date(), locale);       // "2:30 PM" (en) / "14:30" (de)
```

Available functions:
| Function | EN Example | DE Example |
|----------|-----------|-----------|
| `formatDateShort` | Mar 23, 2026 | 23. März 2026 |
| `formatDateLong` | Monday, March 23, 2026 | Montag, 23. März 2026 |
| `formatDateTime` | Mar 23, 2:30 PM | 23. März, 14:30 |
| `formatDateCompact` | Mar 23, 2:30 PM | 23. Mär., 14:30 |
| `formatMonthYear` | Mar 2026 | März 2026 |
| `formatTime` | 2:30 PM | 14:30 |
| `formatISODate` | 2026-03-23 | 2026-03-23 (always ISO) |
| `formatNumber` | 1,000 | 1.000 |
| `formatDecimal` | 1,234.5 | 1.234,5 |
| `formatPercent` | 80% | 80 % |
| `formatCurrency` | €1,000 | 1.000 € |

**Important:** Use `formatISODate()` for machine-readable dates (data keys, CSV export, filenames).

## Migration to LinguiJS Macros (Future)

The current dictionary + formatters approach is designed as a **compatible fallback**.
When `@lingui/swc-plugin` supports Next.js 15.5+, the migration path is:

| Current | Future (LinguiJS Macros) |
|---------|-------------------------|
| `t("nav.dashboard")` | `` t`Dashboard` `` |
| `useTranslations()` | `useLingui()` |
| `dictionaries.ts` | PO files (auto-extracted) |
| `formatters.ts` | ICU format in PO: `{date, date, medium}` |
| `FormatSettings` overrides | Keep as-is (Intl layer) |

The `useTranslations()` hook and `t(key)` function have the same API shape,
so component code changes are minimal.

## EU API Language Integration

The user's locale is automatically passed to:
- **ESCO Search API** — occupation names in user's language
- **ESCO Details API** — descriptions in user's language
- **EURES Occupations** — autocomplete suggestions in user's language
- **Eurostat NUTS** — region names in user's language (via `lang=` parameter)
- **EURES Search** — job titles/descriptions via `requestLanguage`
