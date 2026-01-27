"use client";

import { useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";

type ChartConfig = {
  label: string;
  data: any[];
  keys: string[];
  groupMode?: "grouped" | "stacked";
  axisLeftLegend: string;
};

type WeeklyBarChartToggleProps = {
  charts: ChartConfig[];
};

export default function WeeklyBarChartToggle({
  charts,
}: WeeklyBarChartToggleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = charts[activeIndex];

  const roundedData = current.data.map((item) => {
    const newItem: any = { ...item };
    current.keys.forEach((key) => {
      if (typeof newItem[key] === "number") {
        newItem[key] = Math.round(newItem[key] * 100) / 100;
      }
    });
    return newItem;
  });

  return (
    <Card className="mb-2 lg:mb-0">
      <CardContent className="h-[240px] p-3 pt-1">
        <div className="flex items-center justify-end mb-1 mt-3">
          <div className="flex rounded-md border text-xs">
            {charts.map((chart, index) => (
              <button
                key={chart.label}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "px-2 py-1 transition-colors",
                  index === 0 && "rounded-l-md",
                  index === charts.length - 1 && "rounded-r-md",
                  activeIndex === index
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {chart.label}
              </button>
            ))}
          </div>
        </div>
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
              current.groupMode === "stacked" ? { scheme: "nivo" } : "#2a7ef0"
            }
            enableTotals={current.groupMode === "stacked" ? true : false}
            valueFormat={(value) => value.toFixed(2)}
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
            labelTextColor={{
              from: "color",
              modifiers: [["darker", 1.6]],
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: "DAYS OF WEEK",
              legendPosition: "middle",
              legendOffset: 32,
              truncateTickAt: 0,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: current.axisLeftLegend,
              legendPosition: "middle",
              legendOffset: -40,
              truncateTickAt: 0,
            }}
            motionConfig="gentle"
          />
        </div>
      </CardContent>
    </Card>
  );
}
