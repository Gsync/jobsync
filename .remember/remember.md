# Handoff

## State
I completed EURES Location/ESCO Occupation multi-select comboboxes, full i18n (496 keys, 4 locales, 53 components), locale-aware formatting, and all critical code review fixes (auth on API proxies, SSRF protection, connectorParams bug). Branch `feature/eures-integration` on `rorar/jobsync`, latest commit `1506e88`. Build passes, dev server on port 3737. Roadmap at `docs/ROADMAP.md`.

## Next
1. Remaining review suggestions: translate Combobox-internal strings (~10), fix du/Sie inconsistency in DE, translate `TASK_STATUSES`/`JOB_SOURCES` constants
2. i18n Phase 4 leftover: `setFormatOverrides` dead code cleanup, `TranslationKey` union type
3. Pick next roadmap feature (Arbeitsagentur connector, Job-Tinder, or CareerBERT)

## Context
- NixOS: Prisma engines patched in `/tmp/prisma-engines/`, bun patched. Use `./scripts/dev.sh` etc.
- Jest doesn't run under Bun on NixOS (readonly property bug). Dictionary validation via `bun run /tmp/test-dictionaries.ts`.
- Always update i18n dictionaries when changing UI strings — use parallel agents. See `CLAUDE.md`.
- `@/i18n` (client) and `@/i18n/server` (server) barrel imports only — never internal modules.
