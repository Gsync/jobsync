"use client";

import { useEffect, useRef, useState } from "react";
import { startOfDay, subDays } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAiUsage } from "@/actions/aiUsage.actions";
import type { AiUsageRange, AiUsageSummary } from "@/models/aiUsage.model";
import UsageSummaryCards from "./ai-usage-settings/UsageSummaryCards";
import DailyTokensChart from "./ai-usage-settings/DailyTokensChart";
import ProviderModelTable from "./ai-usage-settings/ProviderModelTable";
import FeatureBreakdown from "./ai-usage-settings/FeatureBreakdown";
import FailuresCard from "./ai-usage-settings/FailuresCard";
import RecentCallsTable from "./ai-usage-settings/RecentCallsTable";

const RANGES: AiUsageRange[] = [7, 30];

export default function AiUsageSettings() {
  const [range, setRange] = useState<AiUsageRange>(30);
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const failuresRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Local midnight of the oldest day: only the browser knows its calendar.
    const since = startOfDay(subDays(new Date(), range - 1));
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getAiUsage({ rangeDays: range, since, timeZone })
      .then((res) => {
        if (cancelled) return;
        setFailed(!res.success);
        if (res.success) setSummary(res.data);
      })
      // A thrown action (server restart, dropped network) must not spin forever.
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    // Named: @container/main also spans the settings sidebar.
    <div className="@container/ai-usage flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">AI Usage</h2>
          <p className="text-sm text-muted-foreground">
            Tokens, response times and failures across your providers and
            models.
          </p>
        </div>
        <div
          role="group"
          aria-label="Date range"
          className="flex gap-0.5 rounded-md bg-muted p-1"
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn(
                "h-8 rounded px-3 text-[13px]",
                range === r
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {`${r} days`}
            </button>
          ))}
        </div>
      </div>

      {loading && !summary && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {failed && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load AI usage.
        </p>
      )}

      {summary && !failed && (
        <div className={cn("flex flex-col gap-5", loading && "opacity-60")}>
          {summary.totals.calls === 0 ? (
            <div className="rounded-lg border px-5 py-10 text-center text-sm text-muted-foreground">
              {`No AI calls in the last ${summary.rangeDays} days.`}
            </div>
          ) : (
            <>
              <UsageSummaryCards
                totals={summary.totals}
                failuresByStatus={summary.failuresByStatus}
                rangeDays={summary.rangeDays}
                onShowFailures={() =>
                  failuresRef.current?.scrollIntoView({ behavior: "smooth" })
                }
              />
              <DailyTokensChart
                days={summary.days}
                providers={summary.providers}
              />
              <ProviderModelTable providers={summary.providers} />
              <div className="grid grid-cols-1 gap-4 @3xl/ai-usage:grid-cols-2">
                <FeatureBreakdown features={summary.features} />
                <FailuresCard
                  ref={failuresRef}
                  totals={summary.totals}
                  failuresByStatus={summary.failuresByStatus}
                />
              </div>
            </>
          )}
          {summary.recent.length > 0 && (
            <RecentCallsTable recent={summary.recent} />
          )}
        </div>
      )}
    </div>
  );
}
