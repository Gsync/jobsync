# CLAUDE.md — JobSync Project Guidelines

## Project Overview

JobSync is a self-hosted job application tracker built with Next.js 15, Prisma (SQLite), and Shadcn UI. It includes EURES/ESCO integration for European job discovery automations.

## Development Environment

### Option A: devenv (recommended for standard NixOS)

```bash
devenv shell    # Enter dev environment with all dependencies
dev             # Start Next.js dev server
test            # Run Jest tests
build           # Production build
db-migrate      # Run Prisma migrations
devenv up       # Start all processes
```

See `devenv.nix` for the full configuration. Requires a writable Nix store.

### Option B: Helper scripts (for read-only Nix store / VMs)

```bash
./scripts/dev.sh      # Start dev server (port 3737)
./scripts/build.sh    # Production build
./scripts/test.sh     # Run Jest tests (uses system Node.js)
./scripts/stop.sh     # Stop dev server
./scripts/prisma-generate.sh  # Generate Prisma client
./scripts/prisma-migrate.sh   # Run migrations
```

All scripts source `scripts/env.sh` which auto-downloads and patches Prisma engines for NixOS.

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

## Connector Architecture (ACL Pattern)

All external integrations follow the **App ↔ Connector ↔ Module** pattern:

```
App (Core Logic)
  ↕ ConnectorResult<T> / DiscoveredVacancy / ActionResult
Connector (Shared ACL — ONE interface, ONE registry)
  - DataSourceConnector interface: search(), getDetails()
  - ConnectorRegistry: maps module names → factories
  - Runner: orchestrates search + matching
  ↕
Modules (each implements DataSourceConnector)
  - EURES Module: speaks EURES API protocol
  - Arbeitsagentur Module: speaks Bundesagentur API protocol
  - JSearch Module: speaks RapidAPI/Google Jobs protocol
```

**Key principle:** The Connector is the shared domain layer. Modules are pluggable implementations. If a Module crashes, the Connector catches it via `ConnectorResult<error>`.

**Current implementation (pre-migration):** `src/lib/scraper/`
- Shared: `types.ts` (Connector interface), `registry.ts`, `runner.ts`, `mapper.ts`
- Modules: `eures/`, `arbeitsagentur/`, `jsearch/` (each with `index.ts`, `types.ts`, `resilience.ts`)

**Target structure (Roadmap 0.1):** `src/lib/connector/` with `modules/` subdirectory.

**For new Modules:** Create `src/lib/connector/modules/{name}/` with `index.ts` (implements `DataSourceConnector`), `types.ts`, `resilience.ts`. Register in `registry.ts`.

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

## Domain-Driven Design (DDD) Principles

This project uses DDD idioms. All agents and contributors MUST follow these principles:

### Ubiquitous Language

Use consistent domain terms across code, UI, specs, and documentation:

| Domain Term | Meaning | NOT |
|---|---|---|
| `DiscoveredVacancy` | A job found by an automation | "scraped job", "result" |
| `Connector` | ACL that translates external APIs to domain types | "scraper", "fetcher" |
| `Module` | External system behind a Connector | "API", "service" |
| `Automation` | A scheduled job search configuration | "cron job", "task" |
| `ActionResult<T>` | Typed server action response | `Promise<any>` |

### Bounded Contexts

Each Connector is a Bounded Context with its own internal language:

```
src/lib/scraper/
  eures/          ← EURES Context (locationCodes, jvProfiles, requestLanguage)
  arbeitsagentur/ ← Arbeitsagentur Context (arbeitsort, beruf, refnr)
  jsearch/        ← JSearch Context (job_city, employer_name)
```

Contexts communicate ONLY through the shared domain type `DiscoveredVacancy`. Never leak context-specific types (e.g., `ArbeitsagenturJob`) into the App layer.

### Anti-Corruption Layer (ACL)

See "Connector Architecture" section above. Every external integration MUST have a Connector that:
1. Translates foreign types → domain types
2. Implements resilience (circuit breaker, retry)
3. Returns `ConnectorResult<T>` — never raw exceptions

### Value Objects

Prefer Value Objects for domain concepts without identity:
- `ActionResult<T>` — operation outcome
- `DiscoveredVacancy` — job data (identity via `externalId`)
- `EuresCountry` — country reference data
- Use `as const` for immutable value collections

### Aggregate Boundaries

When modifying data, respect aggregate boundaries:
- **Job Aggregate:** Job + Notes + Tags + Status (modify together via `job.actions.ts`)
- **Automation Aggregate:** Automation + Runs + Discovered Jobs (via `automation.actions.ts`)
- **Profile Aggregate:** Profile + Resumes + Sections + Contact Info (via `profile.actions.ts`)
- Never modify an aggregate's children from outside its action file

### Repository Pattern

Server actions (`src/actions/*.ts`) serve as Repositories:
- Each aggregate has one action file (its Repository)
- Return `ActionResult<T>` for typed responses (Pattern A)
- Pattern B functions (`getAllX`) may return raw arrays — see `specs/action-result.allium`
- Dashboard functions (Pattern C) use custom return types

### Domain Events (Future)

Currently implicit in `AutomationRun` status transitions. When implementing CRM features (Roadmap Section 5), introduce an explicit Event Bus for:
- `JobDiscovered` → trigger notifications, CRM updates
- `ApplicationStatusChanged` → trigger follow-ups, calendar events
- `ConnectorHealthChanged` → trigger alerts

### Specification Pattern (Allium)

Formal specifications in `specs/*.allium` capture domain behaviour:
- Write specs BEFORE implementing complex features
- Specs are the single source of truth for domain rules
- Use `allium:elicit` to build specs through conversation
- Use `allium:distill` to extract specs from existing code

## Code Conventions

- Use `useTranslations()` hook for client components, `t(locale, key)` for server components
- Use formatters from `@/i18n` for all user-visible dates/numbers
- Commit messages follow conventional commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`
- Helper scripts in `./scripts/` can always be run without asking
- Delegate large-scale changes (translation, formatting) to parallel agents
- Use DDD terminology in code, comments, commits, and documentation

## Git Workflow

- Upstream: `Gsync/jobsync` (fork)
- Always commit with logical grouping, not one big commit
- Push explicitly when asked
