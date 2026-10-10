import { z } from "zod";
import { DAILY_GOALS } from "@/lib/constants";

const wholeNumber = (min: number, max: number) =>
  z
    .number({ error: "Enter a number." })
    .int({ message: "Use a whole number." })
    .min(min, { message: `Must be at least ${min}.` })
    .max(max, { message: `Must be at most ${max}.` });

export const GoalTargetsSchema = z.object({
  jobs: wholeNumber(DAILY_GOALS.JOBS_MIN, DAILY_GOALS.JOBS_MAX),
  hours: wholeNumber(DAILY_GOALS.HOURS_MIN, DAILY_GOALS.HOURS_MAX),
});

export type GoalTargets = z.infer<typeof GoalTargetsSchema>;

// Keyed by "YYYY-MM"; a month with no entry carries the latest earlier one
export type GoalTargetsByMonth = Record<string, GoalTargets>;

export interface GoalStreaks {
  current: number;
  best: number;
}
