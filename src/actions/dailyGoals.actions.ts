"use server";

import { format } from "date-fns";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "@/actions/shared";
import {
  buildGoalValues,
  goalMonthRange,
  isValidMonth,
  monthBounds,
  parseStoredTargets,
  type GoalMonthData,
  type GoalValues,
} from "@/lib/dailyGoals";
import {
  GoalTargetsSchema,
  type GoalTargetsByMonth,
} from "@/models/dailyGoals.model";
import { defaultUserSettings } from "@/models/userSettings.model";

type Failure = { success: false; message: string };

async function loadGoalValues(
  userId: string,
  start: Date,
  end: Date,
): Promise<GoalValues> {
  const range = { gte: start, lte: end };
  const [jobs, activities] = await Promise.all([
    prisma.job.groupBy({
      by: "appliedDate",
      _count: { _all: true },
      where: { userId, applied: true, appliedDate: range },
    }),
    prisma.activity.findMany({
      where: { userId, startTime: range, duration: { not: null } },
      select: { startTime: true, duration: true },
    }),
  ]);
  return buildGoalValues(jobs, activities);
}

async function loadStoredTargets(userId: string): Promise<{
  settings: Record<string, any> | null;
  targets: GoalTargetsByMonth;
}> {
  const row = await prisma.userSettings.findUnique({
    where: { userId },
    select: { settings: true },
  });
  const settings = row ? JSON.parse(row.settings) : null;
  return { settings, targets: parseStoredTargets(settings?.goals?.targets) };
}

export async function getDailyGoalValues(
  month: string,
): Promise<{ success: true; data: GoalMonthData } | Failure> {
  try {
    const user = await requireUser();
    const { minMonth, maxMonth } = goalMonthRange(
      format(new Date(), "yyyy-MM-dd"),
    );
    // Client-supplied: only the browsable window is queryable
    if (!isValidMonth(month) || month < minMonth || month > maxMonth) {
      return { success: false, message: "Invalid month." };
    }
    const { start, end } = monthBounds(month);
    const [values, { targets }] = await Promise.all([
      loadGoalValues(user.id, start, end),
      // Corrupt settings JSON must not hide the values; targets use defaults
      loadStoredTargets(user.id).catch((error) => {
        if (error instanceof SyntaxError) return { targets: {} };
        throw error;
      }),
    ]);
    return { success: true, data: { values, targets } };
  } catch (error) {
    // handleError types success as boolean; re-wrap to keep the union narrow.
    const { message } = handleError(error, "Failed to load daily goals.");
    return { success: false, message };
  }
}

export async function updateGoalTargets(input: {
  month: string;
  jobs: number;
  hours: number;
}): Promise<
  { success: true; data: { targets: GoalTargetsByMonth } } | Failure
> {
  try {
    const user = await requireUser();
    // Only the current month is writable, so history can't be edited
    if (input.month !== format(new Date(), "yyyy-MM")) {
      return {
        success: false,
        message: "The month has changed — reload the page.",
      };
    }
    const parsed = GoalTargetsSchema.safeParse({
      jobs: input.jobs,
      hours: input.hours,
    });
    if (!parsed.success) {
      return { success: false, message: "Invalid goal targets." };
    }
    const { settings, targets: current } = await loadStoredTargets(user.id);
    const targets = { ...current, [input.month]: parsed.data };
    const base = settings ?? defaultUserSettings;
    // updateUserSettings only deep-merges ai/display, so merge goals here
    const json = JSON.stringify({
      ...base,
      goals: { ...base.goals, targets },
    });
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { settings: json },
      create: { userId: user.id, settings: json },
    });
    return { success: true, data: { targets } };
  } catch (error) {
    const { message } = handleError(error, "Failed to save daily goals.");
    return { success: false, message };
  }
}
