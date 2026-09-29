import { AI_USAGE_CONSTANTS } from "@/lib/constants";
import {
  AI_FAILURE_STATUSES,
  type AiFailureStatus,
  type AiModelUsage,
  type AiUsageFeature,
  type AiUsageRange,
  type AiUsageSummary,
} from "@/models/aiUsage.model";

export type AiCallRecord = {
  startedAt: Date;
  feature: string;
  provider: string;
  model: string;
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
  firstTokenMs: number | null;
  numCtx: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Nearest rank, in JS: SQLite has no percentile function.
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

export function dayKey(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function rangeDayKeys(
  since: Date,
  rangeDays: number,
  timeZone: string,
): string[] {
  // Noon offsets keep a 23h or 25h DST day from skipping or repeating a key.
  return Array.from({ length: rangeDays }, (_, i) =>
    dayKey(new Date(since.getTime() + i * DAY_MS + DAY_MS / 2), timeZone),
  );
}

const tokensOf = (r: AiCallRecord) =>
  (r.inputTokens ?? 0) + (r.outputTokens ?? 0);

// Completed calls only, so an instant connection error can't drag a median.
const isCompleted = (r: AiCallRecord) =>
  r.status === "ok" || r.status === "truncated";

function timings(rows: AiCallRecord[]) {
  const done = rows.filter(isCompleted);
  const durations = done.map((r) => r.durationMs);
  const firstTokens = done.flatMap((r) =>
    r.firstTokenMs === null ? [] : [r.firstTokenMs],
  );
  return {
    medianMs: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    medianFirstTokenMs: percentile(firstTokens, 50),
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

const sumTokens = (rows: AiCallRecord[]) =>
  rows.reduce((n, r) => n + tokensOf(r), 0);

export function summarizeAiUsage(
  rows: AiCallRecord[],
  opts: {
    rangeDays: AiUsageRange;
    since: Date;
    timeZone: string;
    previousCalls: number;
  },
): Omit<AiUsageSummary, "recent"> {
  const failuresByStatus = Object.fromEntries(
    AI_FAILURE_STATUSES.map((s) => [
      s,
      rows.filter((r) => r.status === s).length,
    ]),
  ) as Record<AiFailureStatus, number>;

  const days = rangeDayKeys(opts.since, opts.rangeDays, opts.timeZone).map(
    (date) => ({ date, tokensByProvider: {} as Record<string, number> }),
  );
  const dayIndex = new Map(days.map((d, i) => [d.date, i]));
  for (const r of rows) {
    const i = dayIndex.get(dayKey(r.startedAt, opts.timeZone));
    if (i === undefined) continue;
    const bucket = days[i].tokensByProvider;
    bucket[r.provider] = (bucket[r.provider] ?? 0) + tokensOf(r);
  }

  const providers = [...groupBy(rows, (r) => r.provider)]
    .map(([provider, providerRows]) => ({
      provider,
      tokens: sumTokens(providerRows),
      calls: providerRows.length,
      models: [...groupBy(providerRows, (r) => r.model)]
        .map(
          ([model, modelRows]): AiModelUsage => ({
            model,
            tokens: sumTokens(modelRows),
            calls: modelRows.length,
            ...timings(modelRows),
            nearContextLimit: modelRows.filter(
              (r) =>
                r.numCtx !== null &&
                r.inputTokens !== null &&
                r.inputTokens >=
                  r.numCtx * AI_USAGE_CONSTANTS.CONTEXT_WARN_RATIO,
            ).length,
          }),
        )
        .sort((a, b) => b.tokens - a.tokens),
    }))
    .sort((a, b) => b.tokens - a.tokens);

  const features = [...groupBy(rows, (r) => r.feature)]
    .map(([feature, featureRows]) => ({
      feature: feature as AiUsageFeature,
      tokens: sumTokens(featureRows),
      calls: featureRows.length,
      medianMs: timings(featureRows).medianMs,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  return {
    rangeDays: opts.rangeDays,
    totals: {
      inputTokens: rows.reduce((n, r) => n + (r.inputTokens ?? 0), 0),
      outputTokens: rows.reduce((n, r) => n + (r.outputTokens ?? 0), 0),
      calls: rows.length,
      previousCalls: opts.previousCalls,
      failures: Object.values(failuresByStatus).reduce((a, b) => a + b, 0),
      stopped: rows.filter((r) => r.status === "stopped").length,
      ...timings(rows),
    },
    failuresByStatus,
    days,
    providers,
    features,
  };
}
