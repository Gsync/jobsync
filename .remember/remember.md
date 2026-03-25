# Handoff

## State
All 48 audit bugs FIXED (48/48). 837 tests passing (49 suites). 10 ADRs in docs/adr/. Full i18n (540+ keys, 4 locales). Branch `main` at latest push.

Roadmap 0.1 COMPLETE: Connector architecture unified under `src/lib/connector/`. Job discovery at `job-discovery/modules/` (eures, arbeitsagentur, jsearch). AI providers at `ai-provider/modules/` (ollama, openai, deepseek) with AIProviderConnector interface, AIProviderRegistry, and eager registration. ADR-010 documents the decision. C4 architecture docs (4 levels) in `docs/architecture/`.

Review fixes applied: H1 (SSRF validation in Ollama module), M1 (resolveApiKey iv="" decrypt), M2 (createModel returns AIConnectorResult), M3 (eager registration), M4-M6 (runner performance: scheduleHour, model caching, resumeText pre-computation).

Developer Settings (A21): debug toggle live at /dashboard/settings with debugLog() utility. DEBUG_LOGGING env var as server-side kill-switch.

## Next
1. Roadmap 0.2: ActionResult<T> typing completion (Pattern A/B/C)
2. Roadmap 0.3: Domain-Model Alignment
3. Low review findings (L1-L8): C4 stale paths, EURES barrel re-export, JSearch barrel asymmetry
4. Continue with Roadmap features (see docs/ROADMAP.md)

## Context
- NixOS: `scripts/setup-prisma-engines.sh` auto-heals `/tmp` clears. `scripts/test.sh` uses system Node.js 24.
- Semgrep hook fires but has no token — safe to ignore.
- User prefers wshobson agent-teams for parallel work (saved in memory).
- UI changes must consult ui-design agent first (saved in memory).
- Post-run self-review checklist before reporting completion (saved in memory).
- `validateOllamaUrl()` validates at Zod schema, verify route, Ollama module resolveBaseUrl, and getOllamaBaseUrl() (defense-in-depth, 4 layers).
- CLAUDE.md Post-Work Checklist section was removed by linter — needs re-adding.
