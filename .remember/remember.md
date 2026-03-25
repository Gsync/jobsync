# Handoff

## State
All 48 audit bugs FIXED (48/48). A18 ActionResult refactoring + Promise<any> typing complete. A21 Developer Settings with debug toggle live. B7 Ollama SSRF patched with defense-in-depth. 10 ADRs in docs/adr/. 808 tests passing. Full i18n (540+ keys, 4 locales). Branch `main` at latest push.

Roadmap 0.1 COMPLETE: Connector architecture unified under `src/lib/connector/`. Job discovery modules at `src/lib/connector/job-discovery/modules/` (eures, arbeitsagentur, jsearch). AI providers at `src/lib/connector/ai-provider/modules/` (ollama, openai, deepseek). `mapScrapedJobToJobRecord` renamed to `mapDiscoveredVacancyToJobRecord`. ADR-010 documents the decision. All documentation updated.

## Next
1. Roadmap 0.2: ActionResult<T> typing completion (Pattern A/B/C)
2. Roadmap 0.3: Domain-Model Alignment
3. Continue with Roadmap features (see docs/ROADMAP.md)

## Context
- NixOS: `scripts/setup-prisma-engines.sh` auto-heals `/tmp` clears. `scripts/test.sh` uses system Node.js 24.
- Semgrep hook fires but has no token — safe to ignore.
- User prefers wshobson agent-teams for parallel work (saved in memory).
- UI changes must consult ui-design agent first (saved in memory).
- `DEBUG_LOGGING` env var controls server-side debug logs (default: enabled). Developer Settings UI in /dashboard/settings.
- `validateOllamaUrl()` validates at Zod schema, verify route, and getOllamaBaseUrl() (defense-in-depth).
