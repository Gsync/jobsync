"use client";

import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useTheme } from "next-themes";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  JobsActivitySummary,
  TopActivityType,
} from "@/actions/dashboard.actions";
import { useElementWidth } from "@/hooks/useElementWidth";
import { usePersistedTabIndex } from "@/hooks/usePersistedTabIndex";
import { APP_CONSTANTS } from "@/lib/constants";
import { SoftPillButton } from "../osui/buttons/soft-pill-button";
import {
  buildDonutSlices,
  CHART_HEIGHT,
  donutLayout,
} from "./jobsActivityChart";

interface JobsActivityCardProps {
  data: {
    label: string;
    summary: JobsActivitySummary;
  }[];
}

// Hole the total needs before the hours, jobs and trend lines all clear the
// ring; under it the trend goes and the other two step down a size.
const FULL_TOTAL_HOLE = 96;

export default function JobsActivityCard({ data }: JobsActivityCardProps) {
  const [activeIndex, selectTab] = usePersistedTabIndex(
    APP_CONSTANTS.DASHBOARD_JOBS_ACTIVITY_STORAGE_KEY,
    data.map((item) => item.label),
  );
  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";
  const current = data[activeIndex];
  const {
    jobsApplied,
    jobsTrend,
    topActivities,
    otherActivities,
    otherHours,
    totalHours,
  } = current.summary;
  const slices = useMemo(
    () => buildDonutSlices(topActivities, otherHours, theme, otherActivities),
    [topActivities, otherHours, theme, otherActivities],
  );
  const layout = donutLayout(chartWidth);
  const roomyTotal = layout.holeDiameter >= FULL_TOTAL_HOLE;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white font-sans @lg:col-span-2">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-1">
        <h3 className="min-w-0 truncate text-sm font-semibold text-neutral-900">
          Jobs &amp; Activity
        </h3>
        <div className="flex shrink-0 gap-1.5" data-testid="jobs-activity-toggle-group">
          {data.map((item, index) => (
            <SoftPillButton
              key={item.label}
              size="sm"
              variant={activeIndex === index ? "dark" : "light"}
              onClick={() => selectTab(index)}
            >
              {item.label}
            </SoftPillButton>
          ))}
        </div>
      </div>
      <div ref={chartRef} className="relative h-[200px] w-full">
        {slices.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-[132px] w-[132px] rounded-full border-[18px] border-neutral-100" />
            <p className="absolute inset-x-0 bottom-0 text-center text-xs text-neutral-500">
              No activities recorded
            </p>
          </div>
        ) : (
          chartWidth > 0 && (
            <div data-testid="donut" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      const datum = payload?.[0]?.payload;
                      if (!active || !datum) return null;
                      return (
                        <div className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs whitespace-nowrap text-neutral-800 shadow-sm">
                          <strong>{datum.label}</strong> — {datum.value}h
                          {datum.breakdown?.map((activity: TopActivityType) => (
                            <div key={activity.label}>
                              {activity.label} — {activity.hours}h
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="72%"
                    outerRadius="95%"
                    paddingAngle={2}
                    cornerRadius={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {slices.map((slice) => (
                      <Cell key={slice.id} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )
        )}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-px text-center"
          data-testid="jobs-activity-total"
        >
          <span className={cn("font-bold tabular-nums text-neutral-900", roomyTotal ? "text-xl" : "text-base")}>
            {totalHours}h
          </span>
          <span className={cn("tabular-nums text-neutral-500", roomyTotal ? "text-sm" : "text-xs")}>
            {jobsApplied} {jobsApplied === 1 ? "job" : "jobs"}
          </span>
          {jobsTrend !== 0 && roomyTotal && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[10px] tabular-nums",
                jobsTrend > 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {jobsTrend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(jobsTrend)}%
            </span>
          )}
        </div>
      </div>
      {slices.length > 0 && (
        <ul className="space-y-1 px-4 pt-1 pb-3" data-testid="jobs-activity-legend">
          {slices.map((slice) => (
            <li
              key={slice.id}
              data-testid={`slice-${slice.id}`}
              className="flex items-center gap-2 text-xs text-neutral-600"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ background: slice.color }}
              />
              <span className="truncate font-medium text-neutral-800">{slice.label}</span>
              <span className="ml-auto shrink-0 tabular-nums">{slice.value}h</span>
              <span className="sr-only">
                {slice.label}:{slice.value}:{slice.color}
                {slice.breakdown?.length
                  ? `:${slice.breakdown.map((a) => `${a.label}=${a.hours}`).join(",")}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
