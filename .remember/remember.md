# Handoff

## State
1143 tests passing (55 suites). 10 ADRs. Full i18n (560+ keys, 4 locales). CI green. Branch `main` at latest push.

All 48 legacy + 17 new bugs (D1-D17) tracked. D1-D14,D16,D17 fixed. D15 partial (BaseCombobox refactored, full form UX review pending).

Completed Roadmap items: 0.1 (Connector Unification), 8.2 (Error Dashboard).

Key deliverables this session:
- Connector architecture: scraper+ai → unified connector/ with AIProviderConnector + Registry
- Error Dashboard: ring buffer + error boundaries + Error Log UI + initClientErrorCapture wired in layout
- Locale testing: formatters (173), resolution (16), component (81), E2E locale-switching (6x3)
- E2E CRUD flows: 6 files (job, automation, task, question, activity, profile)
- UX: QuestionCard, Admin tables (visible buttons), AutomationWizard (API check, threshold, runtimes)
- BaseCombobox: onCreateOption prop, Allium spec with keyboard behavior
- Hybrid Dev Origins: .env sync + runtime CORS middleware + 12 CORS tests
- Schedule frequency: wizard frequencies (6h/12h/2-day/weekly) now applied at runtime
- C4 docs: connector (4 levels), combobox components, error reporting code-level

## Next
1. Roadmap 0.2: ActionResult<T> typing completion
2. D15: Full form UX review (Tab/Enter in all Comboboxes)
3. E2E tests live execution against running server
4. Allium spec validation against official docs
5. Low review findings: L2-L8
6. Roadmap 3.6: Link-Parsing and Auto-Fill
7. specs/ is gitignored — may need .gitignore update

## Context
- NixOS: Node.js 24, scripts/setup-prisma-engines.sh auto-heals.
- Semgrep hook: no token — ignore.
- Preferences: wshobson agents, ui-design first, post-run checklist, Chrome DevTools for client errors.
- BUGS.md: IMMEDIATELY add when user reports bugs.
- Allium docs: github.com/juxt/allium + juxt.github.io/allium/usage
