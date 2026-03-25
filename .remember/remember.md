# Handoff

## State
1131 tests passing (54 suites). 10 ADRs. Full i18n (560+ keys, 4 locales). Branch `main` at latest push.

BUGS.md: D1-D17 all fixed. D15 (ComboBox Tab/Enter) addressed via BaseCombobox refactor with onCreateOption prop.

Session highlights:
- Roadmap 0.1 COMPLETE: Connector architecture unified. Review findings H1, M1-M6 fixed.
- Roadmap 8.2 COMPLETE: Client-Side Error Reporting Dashboard (error boundary + ring buffer + Error Log UI in Developer Settings).
- Locale testing comprehensive: formatters (173), resolution (16), component (81), E2E locale-switching (6x3).
- E2E CRUD flows: 6 new test files (job, automation, task, question, activity, profile) covering Create → Edit → Delete.
- Question Bank UX: 3-dot → visible buttons + click-to-edit. Same pattern applied to 5 Admin tables.
- BaseCombobox refactor: onCreateOption prop, domain logic moved to callers.
- Hybrid Dev Origins: .env sync + runtime CORS middleware (no restart needed).
- CI type-check fixes: strict tsc --noEmit errors in test files resolved.

## Next
1. Roadmap 0.2: ActionResult<T> typing completion
2. Roadmap 0.3: Domain-Model Alignment
3. Roadmap 3.6: Link-Parsing and Auto-Fill
4. Low review findings: L2-L8
5. Formular-UX-Review: comprehensive input field testing across all forms
6. Continue with Roadmap features (see docs/ROADMAP.md)

## Context
- NixOS: `scripts/setup-prisma-engines.sh` auto-heals `/tmp` clears. Node.js 24.
- Semgrep hook: no token — safe to ignore.
- User prefers wshobson agent-teams for parallel work.
- UI changes: consult ui-design agent first.
- Post-run: self-review checklist before reporting completion.
- Monitor BOTH server logs AND Chrome DevTools for client-side errors.
- BUGS.md: IMMEDIATELY add when user reports bugs.
- `validateOllamaUrl()` at 4 layers. Hybrid Dev Origins: .env + runtime middleware.
- 3-tier action pattern: Title click (T1), visible buttons (T2), dropdown 3+ (T3).
- BaseCombobox: headless wrapper for shared Popover/Command shell.
- Error Dashboard: in-memory ring buffer, dev-only, Error Log in Settings sidebar.
