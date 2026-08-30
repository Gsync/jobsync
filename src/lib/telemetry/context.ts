import { AsyncLocalStorage } from "node:async_hooks";

export type ActiveSpan = { traceId: string; spanId: string };

// Unconditional globalThis stash, unlike db.ts's and automation-logger.ts's
// dev-only guards. Those exist to survive hot reload; this one exists because
// Next can emit a module into more than one server bundle, and two ALS
// instances would silently orphan child spans instead of merely duplicating
// work — the waterfall would arrive flat with nothing reporting it.
const globalForTelemetry = globalThis as typeof globalThis & {
  telemetryContextGlobal?: AsyncLocalStorage<ActiveSpan>;
};

export const activeSpanStorage =
  globalForTelemetry.telemetryContextGlobal ??
  new AsyncLocalStorage<ActiveSpan>();

globalForTelemetry.telemetryContextGlobal = activeSpanStorage;

export function currentSpan(): ActiveSpan | undefined {
  return activeSpanStorage.getStore();
}
