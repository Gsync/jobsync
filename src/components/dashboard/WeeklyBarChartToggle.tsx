"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { usePersistedTabIndex } from "@/hooks/usePersistedTabIndex";
import { SoftPillButton } from "../osui/buttons/soft-pill-button";
import {
  OTHER_SLICE_ID,
  otherBucketLabel,
} from "./jobsActivityChart";

// osui ink scale for series (light-first, paper background).
const INK_SERIES = ["#262626", "#525252", "#737373", "#a3a3a3", "#d4d4d4"];
const OTHER_INK = "#e5e5e5";

type ChartConfig = {
  label: string;
  data: any[];
  keys: string[];
  groupMode?: "grouped" | "stacked";
  axisLeftLegend: string;
  tooltipLabel?: (key: string) => string;
};

type WeeklyBarChartToggleProps = {
  charts: ChartConfig[];
};

function TipLabel({
  id,
  current,
}: {
  id: string;
  current: ChartConfig;
}) {
  if (current.tooltipLabel) return <>{current.tooltipLabel(id)}</>;
  if (id === "value")
    return (
      <>
        {current.axisLeftLegend
          .toLowerCase()
          .replace(/\(.*\)/, "")
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase())}
      </>
    );
  if (id === OTHER_SLICE_ID)
    return <>{otherBucketLabel(current.keys.filter((key) => key !== OTHER_SLICE_ID))}</>;
  return <>{id}</>;
}

export default function WeeklyBarChartToggle({
  charts,
}: WeeklyBarChartToggleProps) {
  const [activeIndex, selectTab] = usePersistedTabIndex(
    APP_CONSTANTS.DASHBOARD_WEEKLY_CHART_STORAGE_KEY,
    charts.map((chart) => chart.label),
  );
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const current = charts[activeIndex];
  const stacked = current.groupMode === "stacked";
  const barColors = useMemo(
    () =>
      new Map(
        current.keys.map((key, index) => [
          key,
          key === OTHER_SLICE_ID ? OTHER_INK : INK_SERIES[index % INK_SERIES.length],
        ]),
      ),
    [current.keys],
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsSmallScreen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const roundedData = current.data.map((item) => {
    const newItem: any = { ...item };
    current.keys.forEach((key) => {
      if (typeof newItem[key] === "number") {
        newItem[key] = Math.round(newItem[key] * 100) / 100;
      }
    });
    return newItem;
  });

  const totalHours =
    current.label === "Activities"
      ? roundedData.reduce(
          (sum, item) =>
            sum +
            current.keys.reduce(
              (keySum, key) =>
                keySum + (typeof item[key] === "number" ? item[key] : 0),
              0,
            ),
          0,
        )
      : null;

  return (
    <div className="mb-2 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white font-sans @3xl/main:mb-0">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="truncate text-sm font-semibold text-neutral-900">
            Weekly {current.label}
          </h3>
          {totalHours !== null && (
            <span className="whitespace-nowrap text-xs text-neutral-500">
              {totalHours.toFixed(1)} hrs
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5" data-testid="weekly-chart-toggle-group">
          {charts.map((chart, index) => (
            <SoftPillButton
              key={chart.label}
              size="sm"
              variant={activeIndex === index ? "dark" : "light"}
              onClick={() => selectTab(index)}
            >
              {chart.label}
            </SoftPillButton>
          ))}
        </div>
      </div>

      <div className="h-[200px] px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={roundedData} margin={{ top: 16, right: 12, bottom: 0, left: 0 }} barCategoryGap="35%">
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              interval={isSmallScreen ? 1 : 0}
              tickFormatter={(value: string) => {
                const part = String(value).split(", ")[1];
                return isSmallScreen ? (part ?? value) : value;
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              allowDecimals={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: "#f5f5f5" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs whitespace-nowrap text-neutral-800 shadow-sm">
                    <div className="mb-1 font-medium">{label}</div>
                    {payload.map((p) => (
                      <div key={String(p.dataKey)} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-[2px]"
                          style={{ background: barColors.get(String(p.dataKey)) }}
                        />
                        <TipLabel id={String(p.dataKey)} current={current} />:{" "}
                        <strong>
                          {current.label === "Activities"
                            ? Number(p.value).toFixed(1)
                            : p.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {current.keys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId={stacked ? "total" : undefined}
                fill={barColors.get(key)}
                radius={[3, 3, 0, 0]}
                className={cn(stacked && "stroke-white stroke-1")}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
