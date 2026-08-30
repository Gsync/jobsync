import { randomBytes } from "node:crypto";
import { TELEMETRY_ENABLED } from "./config";
import { activeSpanStorage, currentSpan } from "./context";
import { enqueueSpan, type Attrs } from "./otlp";

export type Span = {
  traceId: string;
  spanId: string;
  setAttrs(attrs: Attrs): void;
  setError(error: unknown): void;
  end(attrs?: Attrs): void;
};

// One shared object rather than a fresh no-op per call: with telemetry off,
// an instrumented request must allocate nothing at all.
const NOOP_SPAN: Span = Object.freeze({
  traceId: "",
  spanId: "",
  setAttrs() {},
  setError() {},
  end() {},
});

function merge(target: Attrs, source: Attrs | undefined): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    target[key] = value;
  }
}

export function startSpan(name: string, attrs?: Attrs): Span {
  if (!TELEMETRY_ENABLED) return NOOP_SPAN;
  try {
    const parent = currentSpan();
    const traceId = parent?.traceId ?? randomBytes(16).toString("hex");
    const spanId = randomBytes(8).toString("hex");
    const startedAt = Date.now();
    const collected: Attrs = {};
    merge(collected, attrs);
    let ended = false;
    let error = false;
    let errorMessage: string | undefined;

    return {
      traceId,
      spanId,
      setAttrs(next) {
        try {
          merge(collected, next);
        } catch {
          // A hostile attrs object degrades telemetry, never the request.
        }
      },
      setError(cause) {
        try {
          error = true;
          errorMessage =
            cause instanceof Error ? cause.message : String(cause);
        } catch {
          error = true;
        }
      },
      end(next) {
        if (ended) return;
        ended = true;
        try {
          merge(collected, next);
        } catch {
          // Keep whatever was collected before the bad object.
        }
        try {
          enqueueSpan({
            name,
            traceId,
            spanId,
            parentSpanId: parent?.spanId,
            startedAt,
            endedAt: Date.now(),
            attrs: collected,
            error,
            errorMessage,
          });
        } catch {
          // Enqueueing must never throw into a request.
        }
      },
    };
  } catch {
    return NOOP_SPAN;
  }
}

// Separate from startSpan because the chat turn starts its span in one scope,
// makes it ambient in a second, and ends it in a third.
export function runInSpan<T>(span: Span, fn: () => T): T {
  if (!TELEMETRY_ENABLED || !span.spanId) return fn();
  return activeSpanStorage.run({ traceId: span.traceId, spanId: span.spanId }, fn);
}

export async function withSpan<T>(
  name: string,
  attrs: Attrs,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const span = startSpan(name, attrs);
  try {
    return await runInSpan(span, () => fn(span));
  } catch (error) {
    span.setError(error);
    throw error;
  } finally {
    span.end();
  }
}
