import { describe, it, expect, vi, afterEach } from "vitest";
import { buildDateNote } from "@/lib/ai/prompts/dateNote";
import { buildResumeReviewPrompt } from "@/lib/ai/prompts/resume-review";
import { buildJobMatchPrompt } from "@/lib/ai/prompts/job-match";
import { buildAutomationJobMatchPrompt } from "@/lib/ai/prompts/automation-match";

describe("buildDateNote", () => {
  afterEach(() => vi.useRealTimers());

  it("states today's date and that everything up to this month is past", () => {
    expect(buildDateNote(new Date("2026-09-19T12:00:00Z"))).toBe(
      "Today's date is 2026-09-19 (September 2026). Every date up to September 2026 — including all of 2025 and earlier, and January through September 2026 — is in the past.",
    );
  });

  it("derives date, month and year from UTC so they never disagree", () => {
    // Late on Dec 31 in the Americas is already Jan 1 in UTC.
    expect(buildDateNote(new Date("2027-01-01T02:00:00Z"))).toBe(
      "Today's date is 2027-01-01 (January 2027). Every date up to January 2027 — including all of 2026 and earlier, and January 2027 — is in the past.",
    );
  });

  it("is built at request time into every date-sensitive prompt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T12:00:00Z"));
    const note = buildDateNote();

    expect(buildResumeReviewPrompt("resume")).toContain(
      `${note} Do not comment on any date unless it is later than today.`,
    );
    for (const prompt of [
      buildJobMatchPrompt("resume", "job"),
      buildAutomationJobMatchPrompt("resume", "job"),
    ]) {
      expect(prompt).toContain(`${note} Use it for any years-of-experience reasoning.`);
    }
  });
});
