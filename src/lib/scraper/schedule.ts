export function calculateNextRunAt(scheduleHour: number): Date {
  const now = new Date();
  const next = new Date();

  next.setHours(scheduleHour, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

export function isAutomationDue(nextRunAt: Date | null): boolean {
  if (!nextRunAt) return false;
  return new Date() >= nextRunAt;
}
