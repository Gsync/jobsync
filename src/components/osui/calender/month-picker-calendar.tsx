"use client";

import {
  forwardRef,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function buildMonthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  return cells;
}

function isSameDay(a: Date, year: number, month: number, day: number) {
  return (
    a.getFullYear() === year && a.getMonth() === month && a.getDate() === day
  );
}

export type MonthPickerCalendarProps = Readonly<
  {
    defaultYear?: number;
    defaultMonth?: number;
    defaultSelectedDay?: number;
    onSelect?: (date: Date) => void;
  } & ComponentPropsWithoutRef<"div">
>;

// Month picker — navigate months and tap a day to select it.
export const MonthPickerCalendar = forwardRef<
  HTMLDivElement,
  MonthPickerCalendarProps
>(
  (
    {
      className,
      defaultYear,
      defaultMonth,
      defaultSelectedDay,
      onSelect,
      ...props
    },
    ref,
  ) => {
    const today = useMemo(() => new Date(), []);
    const [viewYear, setViewYear] = useState(
      defaultYear ?? today.getFullYear(),
    );
    const [viewMonth, setViewMonth] = useState(
      defaultMonth ?? today.getMonth(),
    );
    const [selectedDay, setSelectedDay] = useState(
      defaultSelectedDay ?? today.getDate(),
    );
    const [slideDirection, setSlideDirection] = useState(0);

    const cells = useMemo(
      () => buildMonthCells(viewYear, viewMonth),
      [viewYear, viewMonth],
    );

    const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" },
    );

    const shiftMonth = (delta: number) => {
      setSlideDirection(delta);
      const next = new Date(viewYear, viewMonth + delta, 1);
      setViewYear(next.getFullYear());
      setViewMonth(next.getMonth());
      const lastDay = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0,
      ).getDate();
      setSelectedDay((day) => Math.min(day, lastDay));
    };

    const selectDay = (day: number) => {
      setSelectedDay(day);
      onSelect?.(new Date(viewYear, viewMonth, day));
    };

    return (
      <div
        ref={ref}
        data-slot="month-picker-calendar"
        className={cn(
          "w-72 overflow-hidden rounded-2xl border border-neutral-100 bg-white p-4 font-sans shadow-lg shadow-black/5 select-none",
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-neutral-500 transition-all duration-200 ease-out hover:bg-neutral-100 active:scale-95"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>

          <p
            key={monthLabel}
            className="text-sm font-semibold text-neutral-900 opacity-100 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] starting:translate-y-0.5 starting:opacity-0"
          >
            {monthLabel}
          </p>

          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-neutral-500 transition-all duration-200 ease-out hover:bg-neutral-100 active:scale-95"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-medium text-neutral-400">
          {WEEKDAYS.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>

        <div
          key={`${viewYear}-${viewMonth}`}
          className={cn(
            "grid grid-cols-7 gap-y-1 opacity-100 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] starting:opacity-0",
            slideDirection >= 0
              ? "starting:translate-x-2"
              : "starting:-translate-x-2",
          )}
        >
          {cells.map((day, index) => {
            if (day === null) {
              return <span key={`empty-${index}`} className="h-9" />;
            }

            const isToday = isSameDay(today, viewYear, viewMonth, day);
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                className={cn(
                  "mx-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm tabular-nums transition-all duration-200 ease-out active:scale-95",
                  isSelected
                    ? "scale-100 bg-neutral-900 font-semibold text-white"
                    : "text-neutral-700 hover:bg-neutral-100",
                  isToday && !isSelected && "ring-1 ring-neutral-900/30",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);

MonthPickerCalendar.displayName = "MonthPickerCalendar";
