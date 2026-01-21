"use client";
import { barChartData } from "@/lib/data/barChartData";
import { ResponsiveBar } from "@nivo/bar";
import { Card, CardContent } from "../ui/card";

type WeeklyBarChartProps = {
  data: any[];
  keys: string[];
  groupMode?: "grouped" | "stacked";
  axisLeftLegend: string;
};

export default function WeeklyBarChart({
  data,
  keys,
  groupMode,
  axisLeftLegend,
}: WeeklyBarChartProps) {
  const roundedData = data.map((item) => {
    const newItem: any = { ...item };
    keys.forEach((key) => {
      if (typeof newItem[key] === "number") {
        newItem[key] = Math.round(newItem[key] * 100) / 100;
      }
    });
    return newItem;
  });
  return (
    <Card className="mb-2 lg:mb-0">
      <CardContent className="h-[240px] p-3">
        <ResponsiveBar
          data={roundedData}
          keys={keys}
          indexBy="day"
          margin={{
            top: 20,
            right: 10,
            bottom: 40,
            left: 45,
          }}
          padding={0.6}
          groupMode={groupMode}
          colors={groupMode === "stacked" ? { scheme: "nivo" } : "#2a7ef0"}
          enableTotals={groupMode === "stacked" ? true : false}
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
            legend: axisLeftLegend,
            legendPosition: "middle",
            legendOffset: -40,
            truncateTickAt: 0,
          }}
          motionConfig="gentle"
          // tooltip={({ id, value, color, indexValue }) => (
          //   <div
          //     style={{
          //       padding: 8,
          //       background: "#1e293b",
          //       color: "#fff",
          //       borderRadius: 4,
          //       fontSize: 14,
          //       minWidth: 120,
          //     }}
          //   >
          //     <div>
          //       <span style={{ color }}>{id}:</span>{" "}
          //       <strong>
          //         {value}
          //         {axisLeftLegend.includes("Hours") && "h"}
          //       </strong>
          //     </div>
          //   </div>
          // )}
        />
      </CardContent>
    </Card>
  );
}
