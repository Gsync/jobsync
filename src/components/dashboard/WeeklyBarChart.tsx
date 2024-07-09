"use client";
import { barChartData } from "@/lib/data/barChartData";
import { ResponsiveBar } from "@nivo/bar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function WeeklyBarChart({ data }: { data: any[] }) {
  return (
    <Card className="mb-2 lg:mb-0">
      <CardHeader className="pb-2">
        <CardTitle>Weekly Activity</CardTitle>
      </CardHeader>
      <CardContent className="h-[240px] p-3">
        <ResponsiveBar
          data={data}
          keys={["value"]}
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
          motionConfig="gentle"
          // tooltip={({ value, color }) => (
          //   <div
          //     style={{
          //       padding: 6,
          //       color,
          //       background: "#fff",
          //     }}
          //   >
          //     <strong>Jobs Applied: {value}</strong>
          //   </div>
          // )}
        />
      </CardContent>
    </Card>
  );
}
