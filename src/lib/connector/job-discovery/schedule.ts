export type ScheduleFrequency = "6h" | "12h" | "daily" | "2d" | "weekly";

/**
 * Calculate the next run time based on the preferred hour.
 * For backward compatibility, defaults to daily frequency.
 */
export function calculateNextRunAt(scheduleHour: number, frequency?: ScheduleFrequency): Date {
  const now = new Date();
  const next = new Date();

  next.setHours(scheduleHour, 0, 0, 0);

  const freq = frequency ?? "daily";

  switch (freq) {
    case "6h": {
      // Next run is 6 hours from now, aligned to the nearest 6-hour slot
      const nextRun = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      return nextRun;
    }
    case "12h": {
      // Next run is 12 hours from now
      const nextRun = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      return nextRun;
    }
    case "daily": {
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
    case "2d": {
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      // Add 1 more day (total 2 days from last run)
      next.setDate(next.getDate() + 1);
      return next;
    }
    case "weekly": {
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      // Add 6 more days (total 7 days from last run)
      next.setDate(next.getDate() + 6);
      return next;
    }
    default: {
      // Fallback to daily
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
  }
}

export function isAutomationDue(nextRunAt: Date | null): boolean {
  if (!nextRunAt) return false;
  return new Date() >= nextRunAt;
}
