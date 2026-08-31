import { APP_CONSTANTS } from "@/lib/constants";
import {
  LOGS_URL,
  OTLP_HEADERS,
  SERVICE_NAME,
  TELEMETRY_ENABLED,
  TRACES_URL,
} from "./config";

export type Attrs = Record<string, unknown>;

export type QueuedSpan = {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startedAt: number;
  endedAt: number;
  attrs: Attrs;
  error?: boolean;
  errorMessage?: string;
};

export type QueuedLog = {
  timestamp: number;
  severityNumber: number;
  severityText: string;
  body: string;
  attrs: Attrs;
  traceId?: string;
  spanId?: string;
};

type TelemetryState = {
  spans: QueuedSpan[];
  logs: QueuedLog[];
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
  failures: number;
  dropped: number;
};

// Same globalThis pattern as db.ts, but unconditional: a second copy of this
// module in another server bundle would mean a second timer and a second
// partial batch for no benefit.
const globalForTelemetry = globalThis as typeof globalThis & {
  telemetryStateGlobal?: TelemetryState;
};

function state(): TelemetryState {
  if (!globalForTelemetry.telemetryStateGlobal) {
    globalForTelemetry.telemetryStateGlobal = {
      spans: [],
      logs: [],
      timer: null,
      inFlight: false,
      failures: 0,
      dropped: 0,
    };
  }
  return globalForTelemetry.telemetryStateGlobal;
}

// BigInt literals need ES2020; the project targets ES2017, so build the
// multiplier with the constructor instead.
function nanos(ms: number): string {
  return String(BigInt(Math.trunc(ms)) * BigInt(1_000_000));
}

function encodeValue(value: unknown): unknown {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  // OpenObserve's OTLP-JSON parser rejects doubleValue in every spelling and
  // 400s the whole batch, so a float rides as a string. Still valid OTLP.
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { intValue: String(value) }
      : { stringValue: String(value) };
  }
  return { stringValue: JSON.stringify(value) };
}

function toKeyValues(attrs: Attrs): unknown[] {
  const out: unknown[] = [];
  const capped: string[] = [];
  for (const [key, raw] of Object.entries(attrs)) {
    if (raw === undefined || raw === null) continue;
    const encoded = encodeValue(raw) as { stringValue?: string };
    if (
      typeof encoded.stringValue === "string" &&
      encoded.stringValue.length > APP_CONSTANTS.TELEMETRY_MAX_ATTR_CHARS
    ) {
      encoded.stringValue = encoded.stringValue.slice(
        0,
        APP_CONSTANTS.TELEMETRY_MAX_ATTR_CHARS,
      );
      capped.push(key);
    }
    out.push({ key, value: encoded });
  }
  // Marks that TELEMETRY clipped the attribute, not that the app clipped the
  // model input — jobsync.input.truncated is the other fact entirely.
  if (capped.length) {
    out.push({
      key: "jobsync.telemetry.capped_attrs",
      value: { stringValue: capped.join(",") },
    });
  }
  return out;
}

function resource() {
  return {
    attributes: [{ key: "service.name", value: { stringValue: SERVICE_NAME } }],
  };
}

function encodeSpan(span: QueuedSpan) {
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    ...(span.parentSpanId ? { parentSpanId: span.parentSpanId } : {}),
    name: span.name,
    kind: 1,
    startTimeUnixNano: nanos(span.startedAt),
    endTimeUnixNano: nanos(span.endedAt),
    attributes: toKeyValues(span.attrs),
    status: span.error
      ? { code: 2, message: span.errorMessage ?? "" }
      : { code: 0 },
  };
}

function encodeLog(record: QueuedLog) {
  return {
    timeUnixNano: nanos(record.timestamp),
    severityNumber: record.severityNumber,
    severityText: record.severityText,
    body: { stringValue: record.body },
    attributes: toKeyValues(record.attrs),
    ...(record.traceId ? { traceId: record.traceId } : {}),
    ...(record.spanId ? { spanId: record.spanId } : {}),
  };
}

// A single record that cannot be encoded (a circular attribute value) must
// not take the rest of the batch down with it.
function encodeEach<T>(items: T[], encode: (item: T) => unknown): unknown[] {
  const out: unknown[] = [];
  for (const item of items) {
    try {
      out.push(encode(item));
    } catch {
      // Dropped silently: telemetry never reports on telemetry.
    }
  }
  return out;
}

export function buildTracePayload(spans: QueuedSpan[]) {
  return {
    resourceSpans: [
      {
        resource: resource(),
        scopeSpans: [
          { scope: { name: "jobsync" }, spans: encodeEach(spans, encodeSpan) },
        ],
      },
    ],
  };
}

export function buildLogPayload(records: QueuedLog[]) {
  return {
    resourceLogs: [
      {
        resource: resource(),
        scopeLogs: [
          {
            scope: { name: "jobsync" },
            logRecords: encodeEach(records, encodeLog),
          },
        ],
      },
    ],
  };
}

function backoffDelay(failures: number): number {
  const table = APP_CONSTANTS.TELEMETRY_BACKOFF_MS;
  return table[Math.min(failures, table.length - 1)]!;
}

function ensureTimer(): void {
  const current = state();
  if (current.timer) return;
  const timer = setTimeout(() => {
    state().timer = null;
    void flush();
  }, backoffDelay(current.failures));
  // Never hold the process open for a flush.
  timer.unref?.();
  current.timer = timer;
}

async function post(url: string, payload: unknown): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...OTLP_HEADERS },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(APP_CONSTANTS.TELEMETRY_EXPORT_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function flush(): Promise<void> {
  const current = state();
  // A collector hanging until the POST timeout would otherwise stack
  // in-flight requests, since the timeout is not below the flush interval.
  if (current.inFlight) {
    if (current.spans.length || current.logs.length) ensureTimer();
    return;
  }

  const spans = current.spans.splice(0, APP_CONSTANTS.TELEMETRY_BATCH_SIZE);
  const logs = current.logs.splice(0, APP_CONSTANTS.TELEMETRY_BATCH_SIZE);
  if (!spans.length && !logs.length) return;

  current.inFlight = true;
  try {
    const results = await Promise.all([
      spans.length ? post(TRACES_URL, buildTracePayload(spans)) : true,
      logs.length ? post(LOGS_URL, buildLogPayload(logs)) : true,
    ]);
    // Counted, never logged per occurrence: an hour of downtime must not
    // produce an hour of error spam in the container's own stdout.
    current.failures = results.every(Boolean) ? 0 : current.failures + 1;
  } catch {
    current.failures += 1;
  } finally {
    current.inFlight = false;
    if (current.spans.length || current.logs.length) ensureTimer();
  }
}

function enqueue<T>(queue: T[], record: T): void {
  queue.push(record);
  while (queue.length > APP_CONSTANTS.TELEMETRY_MAX_QUEUE) {
    queue.shift();
    state().dropped += 1;
  }
  ensureTimer();
}

export function enqueueSpan(span: QueuedSpan): void {
  if (!TELEMETRY_ENABLED) return;
  try {
    enqueue(state().spans, span);
  } catch {
    // Enqueueing must never throw into a request.
  }
}

export function enqueueLog(record: QueuedLog): void {
  if (!TELEMETRY_ENABLED) return;
  try {
    enqueue(state().logs, record);
  } catch {
    // Enqueueing must never throw into a request.
  }
}

export function getTelemetryStats() {
  const current = state();
  return {
    queuedSpans: current.spans.length,
    queuedLogs: current.logs.length,
    dropped: current.dropped,
    failures: current.failures,
  };
}

// Test-only: the state lives on globalThis and survives vi.resetModules().
export function resetTelemetryStateForTests(): void {
  const current = state();
  if (current.timer) clearTimeout(current.timer);
  globalForTelemetry.telemetryStateGlobal = undefined;
}
