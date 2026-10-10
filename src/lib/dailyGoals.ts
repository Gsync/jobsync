import { format } from "date-fns";
import type { GcMonthSummaryProps } from "react-goal-calendar";
import { DAILY_GOALS } from "@/lib/constants";
import {
  GoalTargetsSchema,
  type GoalStreaks,
  type GoalTargets,
  type GoalTargetsByMonth,
} from "@/models/dailyGoals.model";

// Directive-free: imported by the server action and the client calendar.

export type GoalValues = Record<string, Record<string, number>>;

export const GOAL_IDS = { JOBS: "jobs", HOURS: "hours" } as const;

export type GoalMonthData = { values: GoalValues; targets: GoalTargetsByMonth };

export const DEFAULT_GOAL_TARGETS: GoalTargets = {
  jobs: DAILY_GOALS.JOBS_TARGET,
  hours: DAILY_GOALS.HOURS_TARGET,
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(month: unknown): month is string {
  return typeof month === "string" && MONTH_PATTERN.test(month);
}

// Settings JSON is not schema-checked by Prisma; ignore anything malformed
export function parseStoredTargets(raw: unknown): GoalTargetsByMonth {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const targets: GoalTargetsByMonth = {};
  for (const [month, value] of Object.entries(raw)) {
    const parsed = GoalTargetsSchema.safeParse(value);
    if (isValidMonth(month) && parsed.success) targets[month] = parsed.data;
  }
  return targets;
}

export function resolveTargets(
  month: string,
  stored: GoalTargetsByMonth,
): GoalTargets {
  let from: string | undefined;
  // "YYYY-MM" sorts as a string; only look backward so the past stays fixed
  for (const key of Object.keys(stored)) {
    if (key <= month && (!from || key > from)) from = key;
  }
  return from ? stored[from] : DEFAULT_GOAL_TARGETS;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return format(new Date(year, monthIndex - 1 + delta, 1), "yyyy-MM");
}

export function monthBounds(month: string): { start: Date; end: Date } {
  const [year, monthIndex] = month.split("-").map(Number);
  return {
    start: new Date(year, monthIndex - 1, 1, 0, 0, 0, 0),
    // Day 0 of the next month is the last day of this one
    end: new Date(year, monthIndex, 0, 23, 59, 59, 999),
  };
}

export function goalMonthRange(today: string): {
  minMonth: string;
  maxMonth: string;
} {
  const maxMonth = today.slice(0, 7);
  return {
    minMonth: shiftMonth(maxMonth, -DAILY_GOALS.MONTHS_BACK),
    maxMonth,
  };
}

export function buildGoalValues(
  jobs: { appliedDate: Date | null; _count: { _all: number } }[],
  activities: { startTime: Date; duration: number | null }[],
): GoalValues {
  const minutes: Record<string, number> = {};
  const values: GoalValues = {};
  const day = (key: string) =>
    (values[key] ??= { [GOAL_IDS.JOBS]: 0, [GOAL_IDS.HOURS]: 0 });

  for (const job of jobs) {
    if (!job.appliedDate) continue;
    day(format(job.appliedDate, "yyyy-MM-dd"))[GOAL_IDS.JOBS] +=
      job._count._all;
  }
  for (const activity of activities) {
    if (activity.duration === null) continue;
    const key = format(activity.startTime, "yyyy-MM-dd");
    day(key);
    minutes[key] = (minutes[key] ?? 0) + activity.duration;
  }
  // Round once per day so summed fractions don't drift
  for (const [key, total] of Object.entries(minutes)) {
    values[key][GOAL_IDS.HOURS] = Math.round((total / 60) * 10) / 10;
  }
  return values;
}

export type MonthSummary = NonNullable<GcMonthSummaryProps["data"]>[string];

export function formatDays(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

const IDS = Object.values(GOAL_IDS);

export function buildMonthSummary(
  month: string,
  values: GoalValues,
  today: string,
  targets: GoalTargets,
  streaks: GoalStreaks | null,
): MonthSummary {
  const hit: Record<string, number> = {};
  const counted: Record<string, number> = {};
  let bothMet = 0;
  let nothingLogged = 0;

  const { end } = monthBounds(month);
  for (let d = 1; d <= end.getDate(); d++) {
    const key = `${month}-${String(d).padStart(2, "0")}`;
    if (key > today) break;
    const day = values[key] ?? {};
    const isMet = (id: (typeof IDS)[number]) => (day[id] ?? 0) >= targets[id];
    // Today counts only once met, so an unfinished day never drags it down
    for (const id of IDS) {
      if (key === today && !isMet(id)) continue;
      counted[id] = (counted[id] ?? 0) + 1;
      if (isMet(id)) hit[id] = (hit[id] ?? 0) + 1;
    }
    if (IDS.every(isMet)) bothMet++;
    if (key < today && IDS.every((id) => !day[id])) nothingLogged++;
  }

  const rings: Record<string, number> = {};
  for (const id of IDS) {
    if (counted[id]) rings[id] = (hit[id] ?? 0) / counted[id];
  }

  return {
    rings,
    stats: [
      {
        label: "Current streak",
        value: streaks ? formatDays(streaks.current) : "—",
        tone: "primary",
      },
      {
        label: "Best streak (12 mo)",
        value: streaks ? formatDays(streaks.best) : "—",
        tone: "warning",
      },
      { label: "Both goals met", value: formatDays(bothMet), tone: "success" },
      {
        label: "Nothing logged",
        value: formatDays(nothingLogged),
        tone: "danger",
      },
    ],
  };
}

export function findStreaks(
  values: GoalValues,
  stored: GoalTargetsByMonth,
  from: string,
  today: string,
): GoalStreaks {
  const byMonth: Record<string, GoalTargets> = {};
  let run = 0;
  let best = 0;
  const [y, m, d] = from.split("-").map(Number);
  for (const day = new Date(y, m - 1, d); ; day.setDate(day.getDate() + 1)) {
    const key = format(day, "yyyy-MM-dd");
    if (key > today) break;
    const month = key.slice(0, 7);
    const targets = (byMonth[month] ??= resolveTargets(month, stored));
    const v = values[key] ?? {};
    if (IDS.every((id) => (v[id] ?? 0) >= targets[id])) {
      run++;
      best = Math.max(best, run);
    } else if (key !== today) {
      // An unfinished today never breaks the run
      run = 0;
    }
  }
  return { current: run, best };
}
