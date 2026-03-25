# Handoff

## State
All 48+14 issues tracked in BUGS.md (D1-D14 all fixed). 1107 tests passing (52 suites). 10 ADRs. Full i18n (550+ keys, 4 locales). Branch `main` at latest push.

Roadmap 0.1 COMPLETE. Review findings H1, M1-M6 all fixed. Wave 1 sprint (D1-D14) complete: Tiptap SSR, Dialog a11y, Activity locale time, Job Source modules, Automations table UX, Admin visible buttons, AutomationWizard (API check + threshold toggle + flexible runtimes), Company logo preview, expanded mock data, allowed dev origins config.

Question Bank UX: 3-dot menu → visible edit/delete + click-to-edit title. Same pattern applied to 5 Admin tables.

Locale testing: formatters (173), resolution (16), component parameterization (81), E2E locale-switching (6x3 browsers).

## Next
1. Roadmap 8.2: Client-Side Error Reporting Dashboard (approved, implement after E2E)
2. Wave 2: E2E comprehensive tests (New Job, Create Automation, New Task, etc. → Edit → Delete)
3. Roadmap 0.2: ActionResult<T> typing completion
4. Low review findings: L2-L8

## Context
- NixOS: `scripts/setup-prisma-engines.sh` auto-heals `/tmp` clears. `scripts/test.sh` uses system Node.js 24.
- Semgrep hook fires but has no token — safe to ignore.
- User prefers wshobson agent-teams for parallel work.
- UI changes must consult ui-design agent first.
- Post-run self-review checklist before reporting completion.
- Monitor BOTH server logs AND Chrome DevTools for client-side errors.
- `validateOllamaUrl()` at 4 layers. `ALLOWED_DEV_ORIGINS` in env + Developer Settings.
- 3-tier action pattern: Title click (T1), visible buttons (T2), dropdown 3+ actions (T3).
- When user reports bugs → IMMEDIATELY add to BUGS.md before fixing.
