import { format } from "date-fns";
import {
  DEFAULT_GOAL_TARGETS,
  buildGoalValues,
  buildMonthSummary,
  findStreaks,
  formatDays,
  goalMonthRange,
  isValidMonth,
  monthBounds,
  parseStoredTargets,
  resolveTargets,
  shiftMonth,
} from "@/lib/dailyGoals";

describe("dailyGoals helpers", () => {
  describe("isValidMonth", () => {
    it.each(["2026-10", "2025-01", "2026-12"])("accepts %s", (m) => {
      expect(isValidMonth(m)).toBe(true);
    });
    it.each(["2026-13", "2026-00", "2026-1", "abc", "", 202610, null])(
      "rejects %s",
      (m) => {
        expect(isValidMonth(m)).toBe(false);
      },
    );
  });

  describe("shiftMonth", () => {
    it("crosses the year boundary backwards and forwards", () => {
      expect(shiftMonth("2026-01", -1)).toBe("2025-12");
      expect(shiftMonth("2025-12", 1)).toBe("2026-01");
      expect(shiftMonth("2026-10", -11)).toBe("2025-11");
    });
  });

  describe("monthBounds", () => {
    it("spans the first to the last local day of the month", () => {
      const { start, end } = monthBounds("2024-02");
      expect(start).toEqual(new Date(2024, 1, 1, 0, 0, 0, 0));
      expect(end).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999));
    });
  });

  describe("goalMonthRange", () => {
    it("covers the current month and the 11 before it", () => {
      expect(goalMonthRange("2026-10-05")).toEqual({
        minMonth: "2025-11",
        maxMonth: "2026-10",
      });
    });
  });

  describe("buildGoalValues", () => {
    it("sums jobs per applied day and hours per start day", () => {
      const result = buildGoalValues(
        [
          { appliedDate: new Date(2026, 9, 1, 9), _count: { _all: 2 } },
          { appliedDate: new Date(2026, 9, 1, 15), _count: { _all: 1 } },
          { appliedDate: new Date(2026, 9, 2, 9), _count: { _all: 4 } },
        ],
        [
          { startTime: new Date(2026, 9, 1, 10), duration: 90 },
          { startTime: new Date(2026, 9, 1, 13), duration: 45 },
          { startTime: new Date(2026, 9, 3, 8), duration: 20 },
        ],
      );
      expect(result).toEqual({
        "2026-10-01": { jobs: 3, hours: 2.3 },
        "2026-10-02": { jobs: 4, hours: 0 },
        "2026-10-03": { jobs: 0, hours: 0.3 },
      });
    });

    it("skips undated jobs and unfinished activities", () => {
      expect(
        buildGoalValues(
          [{ appliedDate: null, _count: { _all: 5 } }],
          [{ startTime: new Date(2026, 9, 1, 10), duration: null }],
        ),
      ).toEqual({});
    });
  });

  describe("formatDays", () => {
    it("uses the singular only for one", () => {
      expect(formatDays(0)).toBe("0 days");
      expect(formatDays(1)).toBe("1 day");
      expect(formatDays(12)).toBe("12 days");
    });
  });

  describe("buildMonthSummary", () => {
    const met = { jobs: 5, hours: 4 };
    const T = { jobs: 5, hours: 4 };
    const stat = (summary: ReturnType<typeof buildMonthSummary>, label: string) =>
      summary.stats?.find((s) => s.label === label)?.value;

    it("rates a past month over all its days", () => {
      const summary = buildMonthSummary(
        "2026-09",
        {
          "2026-09-01": met,
          "2026-09-02": { jobs: 5, hours: 1 },
          "2026-09-03": { jobs: 0, hours: 4 },
        },
        "2026-10-05",
        T,
        null,
      );
      expect(summary.rings).toEqual({ jobs: 2 / 30, hours: 2 / 30 });
      expect(stat(summary, "Both goals met")).toBe("1 day");
      expect(stat(summary, "Nothing logged")).toBe("27 days");
    });

    it("counts a goal exceeded as met and below target as not", () => {
      const summary = buildMonthSummary(
        "2026-09",
        { "2026-09-01": { jobs: 9, hours: 3.9 } },
        "2026-10-05",
        T,
        null,
      );
      expect(summary.rings).toEqual({ jobs: 1 / 30, hours: 0 });
    });

    it("ignores days after today", () => {
      const summary = buildMonthSummary(
        "2026-10",
        { "2026-10-01": met, "2026-10-20": met },
        "2026-10-05",
        T,
        null,
      );
      // Oct 1–4 past, today not met
      expect(summary.rings).toEqual({ jobs: 1 / 4, hours: 1 / 4 });
      expect(stat(summary, "Both goals met")).toBe("1 day");
      expect(stat(summary, "Nothing logged")).toBe("3 days");
    });

    it("counts today per ring only when met", () => {
      const summary = buildMonthSummary(
        "2026-10",
        { "2026-10-05": { jobs: 5, hours: 1 } },
        "2026-10-05",
        T,
        null,
      );
      expect(summary.rings).toEqual({ jobs: 1 / 5, hours: 0 / 4 });
      expect(stat(summary, "Both goals met")).toBe("0 days");
    });

    it("counts today in both goals met once both are met", () => {
      const summary = buildMonthSummary(
        "2026-10",
        { "2026-10-05": met },
        "2026-10-05",
        T,
        null,
      );
      expect(summary.rings).toEqual({ jobs: 1 / 5, hours: 1 / 5 });
      expect(stat(summary, "Both goals met")).toBe("1 day");
    });

    it("never counts today as nothing logged", () => {
      const summary = buildMonthSummary("2026-10", {}, "2026-10-05", T, null);
      expect(stat(summary, "Nothing logged")).toBe("4 days");
    });

    it("first of the month with nothing met has no ring values", () => {
      const summary = buildMonthSummary("2026-10", {}, "2026-10-01", T, null);
      expect(summary.rings).toEqual({});
      expect(stat(summary, "Both goals met")).toBe("0 days");
      expect(stat(summary, "Nothing logged")).toBe("0 days");
    });

    it("uses the real month length", () => {
      expect(
        stat(buildMonthSummary("2024-02", {}, "2026-10-05", T, null), "Nothing logged"),
      ).toBe("29 days");
      expect(
        stat(buildMonthSummary("2026-02", {}, "2026-10-05", T, null), "Nothing logged"),
      ).toBe("28 days");
    });

    it("shows real zeros for a loaded month with no records", () => {
      const summary = buildMonthSummary("2026-08", {}, "2026-10-05", T, null);
      expect(summary.rings).toEqual({ jobs: 0, hours: 0 });
      expect(stat(summary, "Nothing logged")).toBe("31 days");
    });

    it("treats a day with only zeros as nothing logged", () => {
      const summary = buildMonthSummary(
        "2026-09",
        { "2026-09-01": { jobs: 0, hours: 0 }, "2026-09-02": { jobs: 1, hours: 0 } },
        "2026-10-05",
        T,
        null,
      );
      expect(stat(summary, "Nothing logged")).toBe("29 days");
    });

    it("lists the four rows in order with the streaks passed in", () => {
      const summary = buildMonthSummary("2026-09", {}, "2026-10-05", T, {
        current: 1,
        best: 11,
      });
      expect(summary.stats).toEqual([
        { label: "Current streak", value: "1 day", tone: "primary" },
        { label: "Best streak (12 mo)", value: "11 days", tone: "warning" },
        { label: "Both goals met", value: "0 days", tone: "success" },
        { label: "Nothing logged", value: "30 days", tone: "danger" },
      ]);
    });

    it("shows a dash for streaks that failed to load", () => {
      const summary = buildMonthSummary("2026-09", {}, "2026-10-05", T, null);
      expect(stat(summary, "Current streak")).toBe("—");
      expect(stat(summary, "Best streak (12 mo)")).toBe("—");
    });

    it("judges days against the targets passed in", () => {
      const summary = buildMonthSummary(
        "2026-09",
        { "2026-09-01": { jobs: 3, hours: 2 } },
        "2026-10-05",
        { jobs: 3, hours: 2 },
        null,
      );
      expect(summary.rings).toEqual({ jobs: 1 / 30, hours: 1 / 30 });
      expect(stat(summary, "Both goals met")).toBe("1 day");
    });
  });

  describe("parseStoredTargets", () => {
    it("keeps valid month entries", () => {
      expect(
        parseStoredTargets({ "2026-10": { jobs: 3, hours: 4 } }),
      ).toEqual({ "2026-10": { jobs: 3, hours: 4 } });
    });

    it.each([undefined, null, "x", 5, []])("returns {} for %s", (raw) => {
      expect(parseStoredTargets(raw)).toEqual({});
    });

    it("drops bad keys and out-of-range or non-numeric values", () => {
      expect(
        parseStoredTargets({
          "2026-13": { jobs: 3, hours: 4 },
          "2026-09": { jobs: "5", hours: 4 },
          "2026-08": { jobs: 0, hours: 4 },
          "2026-07": { jobs: 3, hours: 2.5 },
          "2026-06": { jobs: 51, hours: 4 },
          "2026-05": { jobs: 2, hours: 25 },
          "2026-04": { jobs: 2, hours: 3 },
        }),
      ).toEqual({ "2026-04": { jobs: 2, hours: 3 } });
    });
  });

  describe("resolveTargets", () => {
    const stored = {
      "2026-03": { jobs: 4, hours: 2 },
      "2026-10": { jobs: 3, hours: 6 },
    };

    it("uses the month's own entry", () => {
      expect(resolveTargets("2026-10", stored)).toEqual({ jobs: 3, hours: 6 });
    });

    it("carries the latest earlier entry forward", () => {
      expect(resolveTargets("2026-09", stored)).toEqual({ jobs: 4, hours: 2 });
      expect(resolveTargets("2027-02", stored)).toEqual({ jobs: 3, hours: 6 });
    });

    it("falls back to the defaults before any entry", () => {
      expect(resolveTargets("2026-02", stored)).toEqual(DEFAULT_GOAL_TARGETS);
      expect(resolveTargets("2026-10", {})).toEqual({ jobs: 5, hours: 4 });
    });

    it("compares months across years", () => {
      expect(
        resolveTargets("2026-01", { "2025-12": { jobs: 2, hours: 1 } }),
      ).toEqual({ jobs: 2, hours: 1 });
    });
  });

  describe("findStreaks", () => {
    const met = { jobs: 5, hours: 4 };
    // Every day from `from` to `to` inclusive, met at the default targets
    const days = (from: string, to: string, value = met) => {
      const out: Record<string, typeof met> = {};
      const d = new Date(`${from}T00:00:00`);
      for (; format(d, "yyyy-MM-dd") <= to; d.setDate(d.getDate() + 1)) {
        out[format(d, "yyyy-MM-dd")] = value;
      }
      return out;
    };

    it("counts both ends of a run across a month boundary", () => {
      expect(
        findStreaks(days("2026-09-25", "2026-10-05"), {}, "2025-11-01", "2026-10-05"),
      ).toEqual({ current: 11, best: 11 });
    });

    it("an unmet today does not break the run", () => {
      const values = { ...days("2026-10-01", "2026-10-04"), "2026-10-05": { jobs: 1, hours: 0 } };
      expect(findStreaks(values, {}, "2025-11-01", "2026-10-05")).toEqual({
        current: 4,
        best: 4,
      });
    });

    it("is zero when neither today nor yesterday is met", () => {
      expect(
        findStreaks(days("2026-09-01", "2026-09-10"), {}, "2025-11-01", "2026-10-05"),
      ).toEqual({ current: 0, best: 10 });
    });

    it("finds the best run anywhere in the window", () => {
      const values = {
        ...days("2026-03-01", "2026-03-20"),
        ...days("2026-10-04", "2026-10-05"),
      };
      expect(findStreaks(values, {}, "2025-11-01", "2026-10-05")).toEqual({
        current: 2,
        best: 20,
      });
    });

    it("judges each day against its own month", () => {
      const stored = { "2026-10": { jobs: 3, hours: 4 } };
      const values = {
        "2026-09-29": met,
        "2026-09-30": met,
        "2026-10-01": { jobs: 3, hours: 4 },
        "2026-10-02": { jobs: 3, hours: 4 },
      };
      expect(findStreaks(values, stored, "2025-11-01", "2026-10-02")).toEqual({
        current: 4,
        best: 4,
      });
      // 4 jobs met October's 3 but not September's 5
      const broken = { ...values, "2026-09-30": { jobs: 4, hours: 4 } };
      expect(findStreaks(broken, stored, "2025-11-01", "2026-10-02")).toEqual({
        current: 2,
        best: 2,
      });
    });

    it("ignores values before the window", () => {
      expect(
        findStreaks(days("2025-10-25", "2025-11-03"), {}, "2025-11-01", "2026-10-05"),
      ).toEqual({ current: 0, best: 3 });
    });

    it("returns zeros with no data", () => {
      expect(findStreaks({}, {}, "2025-11-01", "2026-10-05")).toEqual({
        current: 0,
        best: 0,
      });
    });
  });
});
