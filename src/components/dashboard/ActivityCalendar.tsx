"use client";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { SelectFieldInput } from "../osui/inputs/select-field-input";

// GitHub-style heatmap, hand-rolled (no chart lib): Sunday-start columns,
// neutral-ink intensity scale on paper.
function cellFill(value: number) {
  if (value <= 0) return "bg-neutral-100";
  if (value === 1) return "bg-neutral-300";
  if (value === 2) return "bg-neutral-500";
  if (value === 3) return "bg-neutral-700";
  return "bg-neutral-900";
}

type Day = { date: Date; iso: string; inYear: boolean };

function yearGrid(year: string): Day[] {
  const y = Number(year);
  const jan1 = new Date(y, 0, 1);
  const days: Day[] = [];
  // Leading blanks so Jan 1 lands on its weekday column (Sunday start).
  for (let i = 0; i < jan1.getDay(); i++) {
    days.push({ date: new Date(NaN), iso: "", inYear: false });
  }
  for (let d = new Date(y, 0, 1); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
    const iso = `${y}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: new Date(d), iso, inYear: true });
  }
  return days;
}

export default function ActivityCalendar({
  years,
  dataByYear,
}: {
  years: string[];
  dataByYear: Record<string, any[]>;
}) {
  const [year, setYear] = useState(years.at(-1));
  const data = dataByYear[year ?? ""] ?? [];
  const byDay = useMemo(() => {
    const map = new Map<string, { value: number; hours: number }>();
    for (const d of data) map.set(d.day, { value: d.value ?? 0, hours: d.hours ?? 0 });
    return map;
  }, [dataByYear, year]);
  const days = useMemo(() => yearGrid(year ?? String(new Date().getFullYear())), [year]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white font-sans">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-1">
        <h3 className="text-sm font-semibold text-neutral-900">Activity Calendar</h3>
        <SelectFieldInput
          label="Select year"
          value={year ?? ""}
          onValueChange={setYear}
          options={years.map((y) => ({ value: y, label: y }))}
          containerClassName="w-[130px]"
        />
      </div>
      <div className="overflow-x-auto px-4 pt-2 pb-4">
        <div
          className="grid auto-cols-[11px] grid-flow-col grid-rows-7 gap-[3px]"
          role="img"
          aria-label={`Activity in ${year}`}
        >
          {days.map((d, i) =>
            !d.inYear ? (
              <span key={`blank-${i}`} className="size-[11px]" />
            ) : (
              (() => {
                const entry = byDay.get(d.iso) ?? { value: 0, hours: 0 };
                const tip = `${format(d.date, "EEE MMM d, yyyy")} — ${entry.value} job${entry.value === 1 ? "" : "s"} applied, ${entry.hours} hr${entry.hours === 1 ? "" : "s"} activity`;
                return (
                  <span
                    key={d.iso}
                    data-testid={`day-${d.iso}`}
                    title={tip}
                    className={cn("size-[11px] rounded-[2px]", cellFill(entry.value))}
                  >
                    <span className="sr-only">{tip}</span>
                  </span>
                );
              })()
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// Re-exported for tests that import the tooltip wording indirectly.
export function dayTooltip(dayIso: string, value: number, hours: number) {
  return `${format(parseISO(dayIso), "EEE MMM d, yyyy")} — ${value} job${value === 1 ? "" : "s"} applied, ${hours} hr${hours === 1 ? "" : "s"} activity`;
}
