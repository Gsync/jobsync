import { describe, it, expect } from "vitest";
import {
  followUpDueDate,
  isFollowUpDue,
  FOLLOW_UP_MIN_DAYS,
  FOLLOW_UP_MAX_DAYS,
} from "@/lib/outreach/follow-up";

describe("outreach follow-up rule", () => {
  it("defaults mid-window (12 days after sending)", () => {
    const sent = new Date("2026-09-17T00:00:00Z");
    const due = followUpDueDate(sent);
    const days = (due.getTime() - sent.getTime()) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(FOLLOW_UP_MIN_DAYS);
    expect(days).toBeLessThanOrEqual(FOLLOW_UP_MAX_DAYS);
    expect(due.toISOString()).toBe("2026-09-29T00:00:00.000Z");
  });

  it("flags overdue follow-ups", () => {
    expect(isFollowUpDue(new Date("2026-09-01"), new Date("2026-09-17"))).toBe(true);
    expect(isFollowUpDue(new Date("2026-10-01"), new Date("2026-09-17"))).toBe(false);
    expect(isFollowUpDue(null)).toBe(false);
  });
});
