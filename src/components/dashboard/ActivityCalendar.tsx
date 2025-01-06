"use client";
import { ResponsiveCalendar } from "@nivo/calendar";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
// website examples showcase many properties,
// you'll often use just a few of them.
export default function ActivityCalendar({
  year,
  data,
}: {
  year: string;
  data: any[];
}) {
  const { resolvedTheme } = useTheme();
  const borderColor = resolvedTheme === "light" ? "#ffffff" : "#0e1117";
  return (
    <Card className="w-[100%]">
      <CardHeader>
        <CardTitle>Activity Calendar (Jobs Applied)</CardTitle>
      </CardHeader>
      <CardContent className="h-[200px]">
        <ResponsiveCalendar
          data={data}
          from={`${year}-04-02`}
          to={`${year}-04-02`}
          emptyColor={resolvedTheme === "light" ? "#eeeeee" : "#30363d"}
          colors={["#90e0ef", "#48cae4", "#00b4d8", "#0096c7", "#0077b6"]}
          minValue={2}
          margin={{ top: 20, right: 0, bottom: 20, left: 0 }}
          yearSpacing={40}
          monthBorderColor={borderColor}
          dayBorderWidth={2}
          dayBorderColor={borderColor}
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
          legends={[
            {
              anchor: "bottom-right",
              direction: "row",
              translateY: 36,
              itemCount: 4,
              itemWidth: 42,
              itemHeight: 36,
              itemsSpacing: 14,
              itemDirection: "right-to-left",
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
