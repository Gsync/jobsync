"use client";

import { useMemo, useState } from "react";
import {
  GcMonthCalendar,
  GcMonthSummary,
  type GcGoal,
} from "react-goal-calendar";
import { getDailyGoalValues } from "@/actions/dailyGoals.actions";
import { Card } from "@/components/ui/card";
import { DAILY_GOALS } from "@/lib/constants";
import {
  GOAL_IDS,
  buildMonthSummary,
  goalMonthRange,
  type GoalValues,
  type MonthSummary,
} from "@/lib/dailyGoals";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const GOALS: GcGoal[] = [
  { id: GOAL_IDS.JOBS, label: "Jobs applied", target: DAILY_GOALS.JOBS_TARGET },
  {
    id: GOAL_IDS.HOURS,
    label: "Activity",
    target: DAILY_GOALS.HOURS_TARGET,
    unit: "h",
  },
];

interface DailyGoalsCalendarProps {
  today: string;
  initialValues: GoalValues | null;
}

export default function DailyGoalsCalendar({
  today,
  initialValues,
}: DailyGoalsCalendarProps) {
  const { minMonth, maxMonth } = goalMonthRange(today);
  const [month, setMonth] = useState(maxMonth);
  // null = the server fetch failed: leave uncached so it shows "—"
  const [valuesByMonth, setValuesByMonth] = useState<
    Record<string, GoalValues>
  >(initialValues ? { [maxMonth]: initialValues } : {});
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);

  // Only cached months get an entry; the rest show the package's "—"
  const summaries = useMemo(() => {
    const data: Record<string, MonthSummary> = {};
    for (const [key, values] of Object.entries(valuesByMonth)) {
      data[key] = buildMonthSummary(key, values, today);
    }
    return data;
  }, [valuesByMonth, today]);

  const handleMonthChange = async (next: string) => {
    setMonth(next);
    if (valuesByMonth[next]) return;
    setLoadingMonth(next);
    const result = await getDailyGoalValues(next);
    if (result.success) {
      setValuesByMonth((prev) => ({ ...prev, [next]: result.data }));
    } else {
      toastError(result.message);
    }
    // A later navigation may already own the busy state
    setLoadingMonth((current) => (current === next ? null : current));
  };

  const loading = loadingMonth === month;
  const cardProps = {
    "aria-busy": loading || undefined,
    className: cn("daily-goals-calendar p-4", loading && "opacity-60"),
  };
  const monthProps = {
    today,
    month,
    minMonth,
    maxMonth,
    onMonthChange: handleMonthChange,
  };

  return (
    <>
      <Card {...cardProps}>
        <GcMonthSummary rings={GOALS} data={summaries} {...monthProps} />
      </Card>
      <Card {...cardProps}>
        <GcMonthCalendar
          goals={GOALS}
          values={valuesByMonth[month]}
          legend
          {...monthProps}
        />
      </Card>
    </>
  );
}
