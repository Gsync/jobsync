"use client";

import { useMemo, useState } from "react";
import {
  GcMonthCalendar,
  GcMonthSummary,
  type GcGoal,
} from "react-goal-calendar";
import { getDailyGoalValues } from "@/actions/dailyGoals.actions";
import { Card } from "@/components/ui/card";
import SetGoalsDialog from "@/components/dashboard/SetGoalsDialog";
import {
  GOAL_IDS,
  buildMonthSummary,
  goalMonthRange,
  resolveTargets,
  type GoalMonthData,
  type GoalValues,
  type MonthSummary,
} from "@/lib/dailyGoals";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  GoalStreaks,
  GoalTargets,
  GoalTargetsByMonth,
} from "@/models/dailyGoals.model";

// The summary's rings need labels only; targets vary by month
const RINGS = [
  { id: GOAL_IDS.JOBS, label: "Jobs applied" },
  { id: GOAL_IDS.HOURS, label: "Activity" },
];

const CALENDAR_LABELS = { settings: "Set goals" };

const goalsFor = (targets: GoalTargets): GcGoal[] => [
  { ...RINGS[0], target: targets.jobs },
  { ...RINGS[1], target: targets.hours, unit: "h" },
];

interface DailyGoalsCalendarProps {
  today: string;
  initialData: GoalMonthData | null;
  initialStreaks: GoalStreaks | null;
}

export default function DailyGoalsCalendar({
  today,
  initialData,
  initialStreaks,
}: DailyGoalsCalendarProps) {
  const { minMonth, maxMonth } = goalMonthRange(today);
  const [month, setMonth] = useState(maxMonth);
  // null = the server fetch failed: leave uncached so it shows "—"
  const [valuesByMonth, setValuesByMonth] = useState<
    Record<string, GoalValues>
  >(initialData ? { [maxMonth]: initialData.values } : {});
  // null until any load succeeds; resolves every month, cached or not
  const [storedTargets, setStoredTargets] =
    useState<GoalTargetsByMonth | null>(initialData?.targets ?? null);
  const targetsFor = (key: string) => resolveTargets(key, storedTargets ?? {});
  const [streaks, setStreaks] = useState(initialStreaks);
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Stable identity: the dialog re-applies its pre-fill when this changes
  const currentTargets = useMemo(
    () => resolveTargets(maxMonth, storedTargets ?? {}),
    [maxMonth, storedTargets],
  );

  // Only cached months get an entry; the rest show the package's "—"
  const summaries = useMemo(() => {
    const data: Record<string, MonthSummary> = {};
    for (const [key, values] of Object.entries(valuesByMonth)) {
      data[key] = buildMonthSummary(
        key,
        values,
        today,
        resolveTargets(key, storedTargets ?? {}),
        streaks,
      );
    }
    return data;
  }, [valuesByMonth, storedTargets, streaks, today]);

  const handleMonthChange = async (next: string) => {
    setMonth(next);
    if (valuesByMonth[next]) return;
    setLoadingMonth(next);
    const result = await getDailyGoalValues(next);
    if (result.success) {
      setValuesByMonth((prev) => ({ ...prev, [next]: result.data.values }));
      // Only fills a failed initial load; a save may be newer than this read
      setStoredTargets((prev) => prev ?? result.data.targets);
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
        <GcMonthSummary rings={RINGS} data={summaries} {...monthProps} />
      </Card>
      <Card {...cardProps}>
        <GcMonthCalendar
          goals={goalsFor(targetsFor(month))}
          values={valuesByMonth[month]}
          legend
          labels={CALENDAR_LABELS}
          // No button until targets load: the pre-fill would be defaults
          onSettingsClick={
            storedTargets ? () => setDialogOpen(true) : undefined
          }
          {...monthProps}
        />
      </Card>
      <SetGoalsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        month={maxMonth}
        targets={currentTargets}
        onSaved={(data) => {
          setStoredTargets(data.targets);
          setStreaks(data.streaks);
        }}
      />
    </>
  );
}
