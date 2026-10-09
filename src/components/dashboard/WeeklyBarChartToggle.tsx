"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { ResponsiveBar } from "@nivo/bar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { APP_CONSTANTS } from "@/lib/constants";
import { usePersistedTabIndex } from "@/hooks/usePersistedTabIndex";
import {
  SERIES_COLORS,
  OTHER_COLOR,
  OTHER_SLICE_ID,
  otherBucketLabel,
} from "./jobsActivityChart";

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

export default function WeeklyBarChartToggle({
  charts,
}: WeeklyBarChartToggleProps) {
  const [activeIndex, selectTab] = usePersistedTabIndex(
    APP_CONSTANTS.DASHBOARD_WEEKLY_CHART_STORAGE_KEY,
    charts.map((chart) => chart.label),
  );
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";
  const current = charts[activeIndex];
  const activityColors = useMemo(
    () =>
      new Map(
        current.keys.map((key, index) => [
          key,
          key === OTHER_SLICE_ID
            ? OTHER_COLOR[theme]
            : SERIES_COLORS[theme][index],
        ]),
      ),
    [current.keys, theme],
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

  const isJobsChart = current.label !== "Activities";
  const maxValue = isJobsChart
    ? Math.max(
        0,
        ...roundedData.flatMap((item) =>
          current.keys.map((key) =>
            typeof item[key] === "number" ? item[key] : 0,
          ),
        ),
      )
    : undefined;
  const intTickValues = isJobsChart
    ? Array.from({ length: (maxValue as number) + 1 }, (_, i) => i)
    : undefined;

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
    <Tabs value={current.label} onValueChange={(value) => selectTab(charts.findIndex((item) => item.label === value))} asChild>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <CardTitle className="text-lg truncate">
              Weekly {current.label}
            </CardTitle>
            {totalHours !== null && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {totalHours.toFixed(1)} hrs
              </span>
            )}
          </div>
          <TabsList aria-label="Weekly chart" className="h-8 shrink-0" data-testid="weekly-chart-toggle-group">
            {charts.map((item) => (
              <TabsTrigger key={item.label} value={item.label} className="px-2 py-1 text-xs">{item.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>
      </CardHeader>

      <TabsContent value={current.label} className="mt-0" asChild>
      <CardContent className="h-[240px] p-3 pt-1">
        <div className="h-[200px]">
          <ResponsiveBar
            data={roundedData}
            keys={current.keys}
            indexBy="day"
            margin={{
              top: 20,
              right: 10,
              bottom: 40,
              left: 45,
            }}
            padding={0.6}
            groupMode={current.groupMode}
            colors={
              current.groupMode === "stacked"
                ? (bar) => activityColors.get(String(bar.id)) ?? "#94a3b8"
                : "#2a7ef0"
            }
            enableTotals={current.groupMode === "stacked" ? true : false}
            valueFormat={(value) =>
              current.label === "Activities"
                ? value.toFixed(1)
                : value.toFixed(0)
            }
            theme={{
              text: {
                fill: "#9ca3af",
              },
              tooltip: {
                container: {
                  background: "#1e293b",
                  color: "#fff",
                },
              },
            }}
            axisTop={null}
            axisRight={null}
            enableGridX={false}
            enableGridY={false}
            enableLabel={true}
            labelSkipHeight={1}
            labelTextColor={{
              from: "color",
              modifiers: [["darker", 1.6]],
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legendPosition: "middle",
              legendOffset: 32,
              truncateTickAt: 0,
              format: isSmallScreen
                ? (value: string) => value.split(", ")[1] ?? value
                : undefined,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: current.axisLeftLegend,
              legendPosition: "middle",
              legendOffset: -40,
              truncateTickAt: 0,
              tickValues: intTickValues,
            }}
            motionConfig="gentle"
            tooltip={({ id, value, indexValue, color, data }) => (
              <div
                style={{
                  background: "#1e293b",
                  color: "#fff",
                  padding: "6px 10px",
                  borderRadius: 4,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ marginBottom: 4 }}>{indexValue}</div>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    background: color,
                    borderRadius: 2,
                    marginRight: 6,
                  }}
                />
                {current.tooltipLabel
                  ? current.tooltipLabel(String(id))
                  : String(id) === "value"
                    ? current.axisLeftLegend
                        .toLowerCase()
                        .replace(/\(.*\)/, "")
                        .trim()
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : String(id) === OTHER_SLICE_ID
                      ? otherBucketLabel(
                          current.keys.filter((key) => key !== OTHER_SLICE_ID),
                        )
                      : String(id)}
                :{" "}
                <strong>
                  {current.label === "Activities"
                    ? Number(value).toFixed(1)
                    : value}
                </strong>
                {String(id) === OTHER_SLICE_ID &&
                  (data as any).otherBreakdown?.length > 0 &&
                  (data as any).otherBreakdown.map(
                    (activity: { label: string; hours: number }) => (
                      <div key={activity.label}>
                        {activity.label} – {activity.hours}h
                      </div>
                    ),
                  )}
              </div>
            )}
          />
        </div>
      </CardContent>
      </TabsContent>
    </Card>
    </Tabs>
  );
}
