import { TELEMETRY_ENABLED } from "./config";
import { currentSpan } from "./context";
import { enqueueLog, type Attrs } from "./otlp";

type Level = "info" | "warn" | "error";

// OTLP severity numbers. INFO=9, WARN=13, ERROR=17.
export const SEVERITY: Record<Level, number> = {
  info: 9,
  warn: 13,
  error: 17,
};

const CONSOLE: Record<Level, (...args: unknown[]) => void> = {
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

// console first, always. Debugging a container must never require an
// observability stack to be running — docker compose logs -f is identical
// whether telemetry is on or off.
function emit(level: Level, message: string, attrs?: Attrs): void {
  try {
    if (attrs) CONSOLE[level](message, attrs);
    else CONSOLE[level](message);
  } catch {
    // stdout is not a reason to fail a request either.
  }

  if (!TELEMETRY_ENABLED) return;

  try {
    const active = currentSpan();
    enqueueLog({
      timestamp: Date.now(),
      severityNumber: SEVERITY[level],
      severityText: level.toUpperCase(),
      body: message,
      attrs: attrs ?? {},
      traceId: active?.traceId,
      spanId: active?.spanId,
    });
  } catch {
    // Enqueueing must never throw into a request.
  }
}

export const log = {
  info: (message: string, attrs?: Attrs) => emit("info", message, attrs),
  warn: (message: string, attrs?: Attrs) => emit("warn", message, attrs),
  error: (message: string, attrs?: Attrs) => emit("error", message, attrs),
};
