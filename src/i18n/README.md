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

## How to Add Translations

### 1. Add the key to `src/i18n/dictionaries.ts`

Add the key to **all** locale objects (en, de, fr, es):

```ts
// In the `en` object:
"myFeature.title": "My Feature",

// In the `de` object:
"myFeature.title": "Mein Feature",

// etc.
```

### 2. Use in Client Components

```tsx
import { useTranslations } from "@/i18n/use-translations";

function MyComponent() {
  const { t } = useTranslations();
  return <h1>{t("myFeature.title")}</h1>;
}
```

### 3. Use in Server Components

```tsx
import { getUserLocale } from "@/lib/locale";
import { t } from "@/i18n/dictionaries";

async function MyServerComponent() {
  const locale = await getUserLocale();
  return <h1>{t(locale, "myFeature.title")}</h1>;
}
```

### 4. Use in API Routes

API routes read the locale from the `NEXT_LOCALE` cookie:

```ts
import { getLocaleFromCookie } from "@/lib/locale";

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

## EU API Language Integration

The user's locale is automatically passed to:
- **ESCO Search API** — occupation names in user's language
- **ESCO Details API** — descriptions in user's language
- **EURES Occupations** — autocomplete suggestions in user's language
- **Eurostat NUTS** — region names in user's language (via `lang=` parameter)
- **EURES Search** — job titles/descriptions via `requestLanguage`
