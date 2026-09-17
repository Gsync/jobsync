// Follow-up rule for cold outreach: one follow-up, 10–14 days after sending.
// Default lands mid-window (12 days).

export const FOLLOW_UP_MIN_DAYS = 10;
export const FOLLOW_UP_MAX_DAYS = 14;
export const FOLLOW_UP_DEFAULT_DAYS = 12;

export function followUpDueDate(sentAt: Date, days = FOLLOW_UP_DEFAULT_DAYS): Date {
  const d = new Date(sentAt);
  d.setDate(d.getDate() + days);
  return d;
}

export function isFollowUpDue(followUpDue: Date | null | undefined, now = new Date()): boolean {
  if (!followUpDue) return false;
  return followUpDue <= now;
}
