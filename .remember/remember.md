# Handoff

## State
1143 unit/component tests (55 suites). 11 E2E test files (45 tests across 3 browsers). 10 ADRs. CI green. Full i18n (560+ keys, 4 locales). Branch `main` at latest push.

All bugs D1-D17 tracked in BUGS.md. D15 partial (BaseCombobox refactored, full form UX review pending).

E2E tests live-verified against dev server with system Chromium. Seed script creates test user. All tests pass individually; parallel runs may hit SQLite concurrency limits.

## Next
1. Roadmap 0.2: ActionResult<T> typing completion
2. D15: Full form UX review (Tab/Enter in all Comboboxes)
3. Hybrid Dev Origins: runtime middleware (env-sync done, CORS middleware done)
4. Low review findings: L2-L8
5. Roadmap 3.6: Link-Parsing and Auto-Fill

## Context
- NixOS: Node.js 24, system Chromium at /run/current-system/sw/bin/chromium
- E2E: use `nice -n 10 npx playwright test --project=chromium --workers=1`
- Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/run/current-system/sw/bin/chromium
- NEVER let agents manage the dev server — start externally before E2E agents
- Semgrep hook: no token — ignore
- Preferences: wshobson agents, ui-design first, post-run checklist, Chrome DevTools monitoring
- BUGS.md: IMMEDIATELY add when user reports bugs
