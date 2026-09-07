import { describe, it, expect } from "vitest";
import { combineDateAndTime, formatTime, formatDateTime } from "@/lib/utils";
import { AddActivityFormSchema } from "@/models/addActivityForm.schema";
import { defaultUserSettings } from "@/models/userSettings.model";

describe("Clock Format Utilities", () => {
  describe("defaultUserSettings", () => {
    it("defaults to 12h clock format", () => {
      expect(defaultUserSettings.display.clockFormat).toBe("12h");
    });
  });

  describe("combineDateAndTime", () => {
    it("parses 12-hour AM/PM time strings correctly", () => {
      const baseDate = new Date(2026, 8, 7); // Sept 7, 2026
      const result = combineDateAndTime(baseDate, "09:30 AM");
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(8);
      expect(result.getDate()).toBe(7);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);

      const resultPM = combineDateAndTime(baseDate, "02:45 PM");
      expect(resultPM.getHours()).toBe(14);
      expect(resultPM.getMinutes()).toBe(45);
    });

    it("parses 24-hour time strings correctly", () => {
      const baseDate = new Date(2026, 8, 7);
      const result = combineDateAndTime(baseDate, "14:30");
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(8);
      expect(result.getDate()).toBe(7);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);

      const resultMidnight = combineDateAndTime(baseDate, "00:15");
      expect(resultMidnight.getHours()).toBe(0);
      expect(resultMidnight.getMinutes()).toBe(15);
    });
  });

  describe("formatTime", () => {
    it("formats dates in 12h format by default", () => {
      const date = new Date(2026, 8, 7, 14, 30);
      expect(formatTime(date, "12h")).toBe("02:30 PM");
      expect(formatTime(date)).toBe("02:30 PM");
    });

    it("formats dates in 24h format when requested", () => {
      const date = new Date(2026, 8, 7, 14, 30);
      expect(formatTime(date, "24h")).toBe("14:30");

      const morning = new Date(2026, 8, 7, 9, 5);
      expect(formatTime(morning, "24h")).toBe("09:05");
    });

    it("handles null / invalid dates gracefully", () => {
      expect(formatTime("invalid")).toBe("");
    });
  });

  describe("formatDateTime", () => {
    it("formats date and time in 12h format", () => {
      const date = new Date(2026, 8, 7, 14, 30);
      expect(formatDateTime(date, "12h")).toBe("Sep 7, 2026 2:30 PM");
    });

    it("formats date and time in 24h format", () => {
      const date = new Date(2026, 8, 7, 14, 30);
      expect(formatDateTime(date, "24h")).toBe("Sep 7, 2026 14:30");
    });
  });

  describe("AddActivityFormSchema", () => {
    const baseValid = {
      activityName: "Job Research",
      activityType: "job-search",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      startTime: "09:00 AM",
      endDate: new Date("2026-09-01T00:00:00.000Z"),
      endTime: "10:00 AM",
    };

    it("accepts valid 12-hour start and end times", () => {
      const result = AddActivityFormSchema.safeParse(baseValid);
      expect(result.success).toBe(true);
    });

    it("accepts valid 24-hour start and end times", () => {
      const result = AddActivityFormSchema.safeParse({
        ...baseValid,
        startTime: "14:00",
        endTime: "15:30",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid time strings", () => {
      const result = AddActivityFormSchema.safeParse({
        ...baseValid,
        startTime: "25:00",
      });
      expect(result.success).toBe(false);

      const result2 = AddActivityFormSchema.safeParse({
        ...baseValid,
        startTime: "9:00",
      });
      expect(result2.success).toBe(false);
    });

    it("validates end time is after start time with 24h clock", () => {
      const result = AddActivityFormSchema.safeParse({
        ...baseValid,
        startTime: "15:00",
        endTime: "14:00",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("endTime"))).toBe(true);
      }
    });
  });
});
