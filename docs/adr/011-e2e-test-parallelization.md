# ADR-011: E2E Test Parallelization Strategy

## Status
Accepted

## Context

JobSync's E2E test suite takes 6.1 minutes for 45 tests running on Chromium only. The existing `CLAUDE.md` convention mandates `nice -n 10 npx playwright test --project=chromium --workers=1` for resource-tight NixOS environments, so this baseline is single-worker, not artificially slowed.

Root-cause analysis identified five structural problems:

1. **Per-test UI login:** The `login()` function is duplicated in 9 of 11 spec files. Each test re-authenticates through the UI, adding roughly 3–4 seconds per test. Across 45 tests this accounts for the majority of total runtime.

2. **Serial describes blocking parallelization:** Three files use `test.describe.serial`, which forces sequential execution within those files and prevents Playwright from distributing their tests across workers.

3. **Legacy test files with duplicate coverage:** Three older spec files — `add-job.spec.ts`, `tasks.spec.ts`, and `profile.spec.ts` — test behaviour already covered by newer CRUD successor files, creating maintenance overhead and redundant execution time.

4. **No shared helper module:** `selectOrCreateComboboxOption()` is duplicated in five files with diverging timeout values. `login()` itself has nine copies. There is no `e2e/helpers/` module, so fixes and behavioural changes must be applied in multiple places.

5. **Shared database with no isolation:** All tests share a single `SQLite dev.db` with no transaction wrapping or teardown contract, meaning concurrent writes from parallel tests risk data collisions and non-deterministic failures.

These problems compound: fixing parallelization without addressing login duplication yields minimal speedup; fixing login duplication without removing serial describes leaves test-ordering constraints in place.

## Decision

Adopt an aggressive parallelization strategy with five structural changes applied together.

**1. Shared Auth State via storageState**

A `global-setup.ts` performs one UI login at the start of the test run and persists the NextAuth session cookie to `e2e/.auth/user.json`. All CRUD spec files declare `use: { storageState: 'e2e/.auth/user.json' }` and skip per-test login entirely. The `login()` helper remains available for the smoke project (which tests the login flow itself) but is no longer called from CRUD tests.

**2. Self-Contained Tests with Unique Data and afterEach Cleanup**

All `test.describe.serial` blocks are removed. Each CRUD test creates its own uniquely named data using `Date.now().toString(36)` identifiers (e.g., `"Job E2E-" + uniqueId()`). Test assertions target only records the test itself created. `test.afterEach` deletes the created records via the UI or API. This design makes every test independently runnable in any order or concurrently with others, both across files and within files.

**3. Legacy File Consolidation**

Three legacy spec files are removed or merged:

- `e2e/add-job.spec.ts` — deleted entirely; its coverage is a strict subset of `job-crud.spec.ts`.
- `e2e/tasks.spec.ts` — the five tests not already present in `task-crud.spec.ts` are migrated there; the source file is deleted.
- `e2e/profile.spec.ts` — merged with `e2e/profile-management.spec.ts` into a single `profile-crud.spec.ts`.

This follows the DDD principle established in ADR-004: one aggregate, one Bounded Context, one spec file as the authoritative source of truth.

**4. Category Pipeline in playwright.config.ts**

`playwright.config.ts` is restructured into two named projects:

- `smoke` — auth-free tests (login flow, public routes). No `storageState`. Runs first.
- `crud` — authenticated CRUD tests. Declares `storageState` and `dependencies: ['smoke']`.

If `smoke` fails, Playwright's `dependencies` mechanism blocks `crud` execution entirely (fail-fast). This prevents the full suite from running when the application is not in a usable state, and keeps auth-testing concerns isolated from CRUD concerns.

**5. Shared Helper Module**

`e2e/helpers/index.ts` is introduced as the single source of truth for shared test utilities:

- `login(page)` — retained for smoke tests.
- `selectOrCreateComboboxOption(page, label, value)` — canonical implementation with a single agreed timeout.
- `expectToast(page, message)` — replaces inline `page.getByRole('status')` assertions.
- `navigateTo(page, path)` — wraps `page.goto` with base URL resolution.
- `uniqueId()` — returns `Date.now().toString(36)` for unique test data names.

All five previously duplicated implementations are replaced with imports from this module.

## Consequences

### Positive
- Expected runtime reduction from approximately 6.1 minutes to 1–1.5 minutes (~4× speedup) when run with `--workers=4`.
- Every test is independently runnable: no ordering constraints, no shared state between tests.
- One spec file per aggregate (DDD compliance, consistent with ADR-004 Bounded Context boundaries).
- Shared helpers reduce duplication across 9+ locations to a single maintained implementation.
- Smoke → CRUD pipeline surfaces auth failures immediately without executing the full suite.

### Negative
- Parallel writes to the shared `dev.db` SQLite database introduce a risk of flaky tests from lock contention or data collision. This is mitigated by unique identifiers per test and `afterEach` cleanup, but not eliminated; SQLite does not support row-level locking.
- The `global-setup.ts` and `storageState` pattern adds infrastructure not present in the current setup. It is standard Playwright practice but requires team familiarity.
- `test.afterEach` cleanup adds boilerplate to every CRUD test. This is the price of isolation — the alternative (shared fixtures without cleanup) causes inter-test pollution.

### Neutral
- The `nice -n 10` NixOS convention in `CLAUDE.md` applies to `--workers=1` single-worker runs. With this ADR, the recommended local command becomes `nice -n 10 npx playwright test --project=chromium --workers=4`. The `nice` flag remains appropriate; only the worker count changes.
- Per-test database isolation via SQLite savepoints or transaction rollback was considered (see Alternatives) and deferred. The current approach accepts shared-database risk in exchange for implementation simplicity.

## Alternatives Considered

**Conservative (keep serial describes, parallelise only across files):** Retain `test.describe.serial` and only allow Playwright to distribute files across workers. Lower implementation risk but yields approximately 20% less speedup. Rejected because serial describes mask test isolation bugs: if tests within a describe depend on each other's side effects, those dependencies will resurface as flaky failures when touched by future refactoring. The self-contained pattern is more robust long-term.

**Hybrid (shared auth + legacy consolidation first, serial removal deferred):** Implement global auth state and delete legacy files in one step, then remove serial describes in a follow-up. Considered and rejected because the serial removal is simplest when done alongside the auth migration — the spec files are already being edited to add `uniqueId`-based data creation, and doing both in one pass avoids re-touching the same files twice.

**Per-test database isolation via SQLite savepoints:** Wrap each test in a Prisma transaction and roll it back in `afterEach`. Would provide perfect, zero-leakage isolation and eliminate the flaky-parallel-write risk. Rejected because it requires significant Prisma and Next.js plumbing (test-only transaction context propagation through server actions), does not reflect the production runtime model, and the complexity cost exceeds the benefit given that unique identifiers already provide adequate isolation for the current suite size. Deferred as an open question for future consideration if suite size grows significantly.

## Related

- ADR-004: ACL Connector Module Architecture — established the Bounded Context and DDD patterns (one aggregate, one source of truth) that this ADR applies to test organisation.
- ADR-010: Connector Architecture Unification.
- `specs/e2e-test-infrastructure.allium` — formal behavioural specification for the E2E infrastructure.
- Roadmap Section 8: Developer Experience.
