# Handoff

## State
All 48 audit bugs FIXED (48/48). 1107 tests passing (52 suites). 10 ADRs in docs/adr/. Full i18n (545+ keys, 4 locales). Branch `main` at latest push.

Roadmap 0.1 COMPLETE: Connector architecture unified under `src/lib/connector/`. Review findings H1, M1-M6 all fixed. AIProviderConnector uses ACL Result pattern + eager registration.

Locale testing comprehensive: formatters (173 tests), locale resolution (16 tests), component parameterization (81 tests), E2E locale-switching (6 scenarios x 3 browsers).

Question Bank UX improved: 3-dot menu replaced with visible edit/delete buttons + click-to-edit title. NoteCard pattern adopted. Profile cards i18n fixed (4x hardcoded "Edit" → t("profile.edit")).

## Next
1. Roadmap 0.2: ActionResult<T> typing completion (Pattern A/B/C)
2. Roadmap 0.3: Domain-Model Alignment
3. Low review findings: L2 (EURES barrel re-export), L3 (JSearch barrel asymmetry), L6 (mapper Promise.all), L7 (pagination cap)
4. Activities table UX: same 2-action pattern as QuestionCard (visible buttons instead of 3-dot menu)
5. Continue with Roadmap features (see docs/ROADMAP.md)

## Context
- NixOS: `scripts/setup-prisma-engines.sh` auto-heals `/tmp` clears. `scripts/test.sh` uses system Node.js 24.
- Semgrep hook fires but has no token — safe to ignore.
- User prefers wshobson agent-teams for parallel work (saved in memory).
- UI changes must consult ui-design agent first (saved in memory).
- Post-run self-review checklist before reporting completion (saved in memory).
- `DEBUG_LOGGING` env var controls server-side debug logs (default: enabled).
- `validateOllamaUrl()` validates at 4 layers (Zod, verify route, Ollama module, getOllamaBaseUrl).
- 3-tier action pattern: Title click (Tier 1), visible buttons (Tier 2), dropdown for 3+ actions (Tier 3).
