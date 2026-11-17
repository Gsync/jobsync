# Tests

Every executable test lives here, split by suite first and by the production code it exercises second. The Promptfoo evals are a separate package in `evals/` and are not part of any suite below.

## Suites

| Suite | Directory | Runner | What belongs here |
| --- | --- | --- | --- |
| Unit | `unit/` | Vitest project `unit` | Functions, schemas, server actions and API route handlers, with Prisma and other dependencies mocked |
| Component | `component/` | Vitest project `component` | Components, contexts and hooks rendered with React Testing Library |
| Integration | `integration/` | Vitest project `integration` | Several real layers at a documented boundary; today only the opt-in backup round trip against a real Postgres |
| E2E | `tests/e2e/` | Playwright | Browser flows against a running dev server |

Inside `unit/` and `component/`, a spec sits in the directory that mirrors its primary production module's parent, without `src/` — the spec for `src/lib/jobs/resolve.ts` lives in `unit/lib/jobs/`. Exceptions: `unit/project/` holds repository-wide checks (`browserslistFloor`, `postgresQueryParity`), `unit/scripts/` holds specs for `scripts/`, `component/regressions/` holds cross-feature render regressions, and `unit/proxyMatcher.spec.ts` sits at the suite root because `src/proxy.ts` sits at the `src/` root.

A unit spec that touches Prisma asserts against a mocked client: it proves which query the code builds, not that Postgres accepts it. Only the integration suite runs a real engine.

## Commands

```bash
npm test                  # unit + component (what CI runs)
npm run test:unit
npm run test:component
npm run test:watch        # unit + component, watch mode
npm run test:coverage     # unit + component
npm run test:integration  # opt-in; skips without BACKUP_TEST_DATABASE_URL
npm run test:e2e          # Playwright, needs the dev server
npm test -- tests/unit/lib/jobs/resolveCompany.spec.ts  # one file
```

Next.js route folders such as `[id]` are mirrored as-is; quote those paths in zsh, which otherwise treats the brackets as a glob and fails with "no matches found": `npm test -- 'tests/unit/app/dashboard/myjobs/[id]/JobDetailsPage.spec.tsx'`.

`npm test`, `test:watch` and `test:coverage` never select the integration suite, Playwright or the evals.

## Environments and setup

- Unit defaults to node and component to jsdom; both load `setup/polyfills.ts` then `setup/dom.ts` (jest-dom, observer stubs).
- A unit spec that needs a DOM (`localStorage`, `DOMParser`, HTML parsing) declares `// @vitest-environment jsdom` on its first line; keep that directive when moving a spec.
- Unit and component alias `next-auth`, `next-auth/providers/credentials` and `server-only` to the stubs in `mocks/`.
- Integration runs in Node with only the `@` and `server-only` aliases and no setup files.

## Integration opt-in

`npm run test:integration` loads `.env` when present; exported shell variables take precedence. `integration/backup/backupRoundTrip.spec.ts` skips unless `BACKUP_TEST_DATABASE_URL` is set. When it is, the spec creates a throwaway schema on that server, pushes the Prisma schema into it and drops it afterwards. Point it at a dev database, never production's `jobsync`, and never set the variable in CI:

```bash
BACKUP_TEST_DATABASE_URL=<dev Postgres URL> npm run test:integration
```

## Fixtures and helpers

Keep helpers and fixtures beside the specs that use them, in a local `helpers/` or `fixtures/` directory (for example `unit/lib/jobs/timeline/helpers/timelineDbFake.ts`). Promote one to a top-level `tests/helpers/`, `tests/fixtures/` or `tests/factories/` only when specs in more than one feature need it. Playwright's shared fixture is `tests/e2e/fixtures.ts`; its conventions are in `tests/e2e/CLAUDE.md`.
