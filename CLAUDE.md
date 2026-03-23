# CLAUDE.md — JobSync Project Guidelines

## Project Overview

JobSync is a self-hosted job application tracker built with Next.js 15, Prisma (SQLite), and Shadcn UI. It includes EURES/ESCO integration for European job discovery automations.

## Development Environment (NixOS)

This runs on NixOS with a read-only Nix store. Use the helper scripts:

```bash
./scripts/dev.sh      # Start dev server (port 3737)
./scripts/build.sh    # Production build
./scripts/stop.sh     # Stop dev server
./scripts/prisma-generate.sh  # Generate Prisma client
./scripts/prisma-migrate.sh   # Run migrations
```

All scripts source `scripts/env.sh` which sets Prisma engine paths for NixOS.

**bun** is the package manager (not npm/yarn). Use `bun add`, `bun run`, etc.

## i18n — Internationalization

**CRITICAL: Every UI string must be translated.** When adding or modifying user-visible text, update translations in all 4 locales (EN, DE, FR, ES).

### Import Pattern

```tsx
// Client Components:
import { useTranslations, formatDate, formatNumber } from "@/i18n";
const { t, locale } = useTranslations();

// Server Components / Actions / API Routes:
import { t, getUserLocale, formatDate } from "@/i18n/server";
const locale = await getUserLocale();
```

**Never import from internal modules** (`@/i18n/dictionaries`, `@/i18n/use-translations`, `@/lib/formatters`, `@/lib/locale`). Always use `@/i18n` or `@/i18n/server`.

### Adding Translation Keys

1. Add keys to the appropriate namespace file in `src/i18n/dictionaries/` (dashboard, jobs, activities, tasks, automations, profile, questions, admin, settings)
2. Add translations for ALL 4 locales (en, de, fr, es)
3. Use in components: `t("namespace.keyName")`
4. Validate: `bun run /tmp/test-dictionaries.ts`

Key naming: `namespace.camelCaseKey` (e.g., `jobs.addNote`, `automations.createAutomation`)

### Date/Number Formatting

Always use locale-aware formatters, never hardcoded formats:

```tsx
// CORRECT:
formatDateShort(date, locale)     // "23. März 2026" (de) / "Mar 23, 2026" (en)
formatNumber(1234, locale)        // "1.234" (de) / "1,234" (en)

// WRONG:
format(date, "MMM d, yyyy")      // Always English
value.toLocaleString()            // No explicit locale
```

Use `formatISODate()` for machine-readable dates (CSV, data keys, filenames).

### Architecture

The i18n system uses an **adapter pattern** (`@/i18n/index.ts` + `@/i18n/server.ts`). This allows switching from the current dictionary-based system to LinguiJS macros without changing consumer code. See `src/i18n/README.md` for full documentation.

## EURES/ESCO Integration

- EURES Location Combobox: 3-level hierarchy (Country → NUTS Region → City) with SVG flags
- ESCO Occupation Combobox: Multi-select with detail popovers (ISCO groups, portal links)
- All EU API routes read user locale from `NEXT_LOCALE` cookie
- Eurostat NUTS names are fetched in the user's language
- Flag SVGs are in `public/flags/` (circle-flags library)

## Security Rules

- **All API proxy routes** (`/api/esco/*`, `/api/eures/*`) MUST check `auth()` — never expose EU APIs without authentication
- **ESCO URI validation**: Always validate that user-supplied URIs start with `http://data.europa.eu/esco/` to prevent SSRF
- **Server-only barrel**: `@/i18n/server.ts` has `import "server-only"` — never import it in client components
- **No credentials in commits**: `.env` is gitignored, never commit API keys

## Reusable UI Components

- `src/components/ui/chip-list.tsx` — Multi-select badge chips with edit/remove
- `src/components/ui/info-tooltip.tsx` — Info icon with popover (hover + tap)
- `src/components/ui/command.tsx` — Has `touch-action: pan-y` for mobile scroll fix

## Code Conventions

- Use `useTranslations()` hook for client components, `t(locale, key)` for server components
- Use formatters from `@/i18n` for all user-visible dates/numbers
- Commit messages follow conventional commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`
- Helper scripts in `./scripts/` can always be run without asking
- Delegate large-scale changes (translation, formatting) to parallel agents

## Git Workflow

- Main development branch: `feature/eures-integration`
- Upstream: `Gsync/jobsync` (fork)
- Always commit with logical grouping, not one big commit
- Push explicitly when asked
