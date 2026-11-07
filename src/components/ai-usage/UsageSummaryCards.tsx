import { cn } from "@/lib/utils";
import type { AiUsageSummary } from "@/models/aiUsage.model";
import { formatChange, formatSeconds, formatTokens } from "./format";

function StatCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border px-5 py-4">
      <div className="text-[13px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="text-[26px] font-semibold tracking-tight">{value}</div>
      {children}
    </div>
  );
}

export default function UsageSummaryCards({
  totals,
  failuresByStatus,
  rangeDays,
  onShowFailures,
}: Pick<AiUsageSummary, "totals" | "failuresByStatus" | "rangeDays"> & {
  onShowFailures: () => void;
}) {
  const change = formatChange(totals.calls, totals.previousCalls);
  const errorRate =
    totals.calls === 0 ? 0 : (totals.failures / totals.calls) * 100;
  const f = failuresByStatus;
  return (
    <div className="grid grid-cols-1 gap-4 @xl/ai-usage:grid-cols-2 @3xl/ai-usage:grid-cols-4">
      <StatCard
        label="Total tokens"
        value={formatTokens(totals.inputTokens + totals.outputTokens)}
      >
        <div className="text-xs text-muted-foreground">
          {`${(totals.inputTokens / 1_000_000).toFixed(2)}M input · ${(totals.outputTokens / 1_000_000).toFixed(2)}M output`}
        </div>
      </StatCard>
      <StatCard label="API calls" value={totals.calls.toLocaleString("en-US")}>
        {change && (
          <div
            className={cn(
              "text-xs",
              change.up
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground",
            )}
          >
            {`${change.text} vs previous ${rangeDays} days`}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          A chat turn counts as one call
        </div>
      </StatCard>
      <StatCard
        label="Median response time"
        value={formatSeconds(totals.medianMs)}
      >
        <div className="text-xs text-muted-foreground">
          {`p95 ${formatSeconds(totals.p95Ms)}`}
        </div>
        <div className="text-xs text-muted-foreground">
          {`First token ${formatSeconds(totals.medianFirstTokenMs)} (streamed features)`}
        </div>
      </StatCard>
      <StatCard
        label="Failed calls"
        value={totals.failures.toLocaleString("en-US")}
      >
        <div className="text-xs text-muted-foreground">
          {`${errorRate.toFixed(1)}% error rate`}
        </div>
        <button
          type="button"
          onClick={onShowFailures}
          className="w-fit text-left text-xs text-primary hover:underline"
        >
          {`${f.error} error · ${f.truncated} truncated · ${f.interrupted} interrupted · ${f.timed_out} timed out`}
        </button>
      </StatCard>
    </div>
  );
}
