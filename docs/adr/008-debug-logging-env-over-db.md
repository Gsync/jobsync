# ADR-008: Environment-Based Debug Logging Over Database Settings

## Status
Accepted

## Context

The codebase contained 60+ `console.log`/`console.error` calls across 30 files. Many were debug-level orchestration logs in the scheduler (`src/lib/scheduler/index.ts`), automation runner (`src/lib/connector/job-discovery/runner.ts`), and automation logger (`src/lib/automation-logger.ts`) that clutter production output but are essential during development and troubleshooting.

Bug A21 required a mechanism to gate these logs. Two architectural approaches were considered:

1. **Database-backed settings**: Store debug flags in `UserSettings` (Prisma/SQLite JSON field), read them on each log call via `getUserSettings()`.
2. **Environment variable**: Use `process.env.DEBUG_LOGGING` as a synchronous kill-switch, with `UserSettings.developer` providing UI awareness but not controlling server-side log output.

The scheduler runs on a timer (`setInterval`) and the runner executes inside API route handlers. Both are server-side hot paths where latency matters.

## Decision

Use `process.env.DEBUG_LOGGING` as the server-side logging gate, exposed through a synchronous `debugLog(category, ...args)` utility in `src/lib/debug.ts`. The `UserSettings.developer` interface stores per-category toggles for the Developer Settings UI but does not drive server-side log decisions.

The utility:

```ts
export function debugLog(category: DebugCategory, ...args: unknown[]): void {
  if (process.env.DEBUG_LOGGING === "false") return;
  console.log(`[${category}]`, ...args);
}
```

Default behavior is **enabled** — logging is active unless `DEBUG_LOGGING=false` is explicitly set. This matches the self-hosted nature of the project where developers are the primary operators.

## Consequences

### Positive
- **No async overhead**: `debugLog` is synchronous; no database round-trip on every scheduler tick or runner step.
- **Works before auth**: The scheduler runs outside a request context — there is no authenticated user session to query `UserSettings` from.
- **Simple kill-switch**: Set `DEBUG_LOGGING=false` in `.env` or the process environment to silence all debug output without code changes.
- **No import cycles**: `debug.ts` has zero dependencies; action files and scheduler can import it without pulling in Prisma or auth.

### Negative
- **No per-user granularity**: The env variable is process-wide, not per-user. In a multi-user scenario, one user cannot enable debug logs without affecting all users. This is acceptable for a self-hosted single-user application.
- **UI toggles are cosmetic (for now)**: The Developer Settings UI stores preferences in `UserSettings` but does not propagate them to server-side logging. A future event bus or config reload mechanism could bridge this gap.

### Neutral
- The `DeveloperSettings` interface in `UserSettings` is ready for future use when domain events (Roadmap Section 5) introduce a mechanism to propagate settings changes to long-running server processes.
