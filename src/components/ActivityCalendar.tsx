"use client";
import { ResponsiveCalendar } from "@nivo/calendar";
// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
// website examples showcase many properties,
// you'll often use just a few of them.
export default function MyResponsiveCalendar({ data }: { data: any[] }) {
  return (
    <ResponsiveCalendar
      data={data}
      from="2023-04-02"
      to="2023-12-30"
      emptyColor="#30363d"
      colors={["#3C82F6", "#0067D6", "#004DB6", "#003598"]}
      margin={{ top: 25, right: 40, bottom: 40, left: 0 }}
      yearSpacing={40}
      monthBorderColor="#0e1117"
      dayBorderWidth={2}
      dayBorderColor="#0e1117"
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
  );
}
