"use client";
import { barChartData } from "@/lib/barChartData";
import { ResponsiveBar } from "@nivo/bar";

export default function WeeklyBarChart() {
  return (
    <ResponsiveBar
      data={barChartData.data}
      keys={["jobs"]}
      indexBy="day"
      margin={{
        top: 10,
        right: 10,
        bottom: 40,
        left: 45,
      }}
      padding={0.6}
      groupMode="grouped"
      colors="#2a7ef0"
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
        legend: "NUMBER OF JOBS APPLIED",
        legendPosition: "middle",
        legendOffset: -40,
        truncateTickAt: 0,
      }}
    />
  );
}
