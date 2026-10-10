import {
  getDailyGoalValues,
  getGoalStreaks,
  updateGoalTargets,
} from "@/actions/dailyGoals.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    job: { groupBy: vi.fn() },
    activity: { findMany: vi.fn() },
    userSettings: { findUnique: vi.fn(), upsert: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

describe("getDailyGoalValues", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.job.groupBy as any).mockResolvedValue([]);
    (prisma.activity.findMany as any).mockResolvedValue([]);
    (prisma.userSettings.findUnique as any).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scopes both queries to the user and the month", async () => {
    (prisma.job.groupBy as any).mockResolvedValue([
      { appliedDate: new Date(2026, 8, 2, 9), _count: { _all: 3 } },
    ]);
    (prisma.activity.findMany as any).mockResolvedValue([
      { startTime: new Date(2026, 8, 2, 10), duration: 150 },
    ]);

    const result = await getDailyGoalValues("2026-09");

    const range = {
      gte: new Date(2026, 8, 1, 0, 0, 0, 0),
      lte: new Date(2026, 8, 30, 23, 59, 59, 999),
    };
    expect(prisma.job.groupBy).toHaveBeenCalledWith({
      by: "appliedDate",
      _count: { _all: true },
      where: { userId: "user-id", applied: true, appliedDate: range },
    });
    expect(prisma.activity.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-id",
        startTime: range,
        duration: { not: null },
      },
      select: { startTime: true, duration: true },
    });
    expect(result).toEqual({
      success: true,
      data: { values: { "2026-09-02": { jobs: 3, hours: 2.5 } }, targets: {} },
    });
  });

  it("returns the parsed stored targets scoped to the user", async () => {
    (prisma.userSettings.findUnique as any).mockResolvedValue({
      settings: JSON.stringify({
        ai: {},
        goals: {
          targets: {
            "2026-08": { jobs: 3, hours: 2 },
            "2026-13": { jobs: 3, hours: 2 },
          },
        },
      }),
    });

    const result = await getDailyGoalValues("2026-10");

    expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-id" },
      select: { settings: true },
    });
    expect(result).toEqual({
      success: true,
      data: { values: {}, targets: { "2026-08": { jobs: 3, hours: 2 } } },
    });
  });

  it("still returns values when the settings JSON is malformed", async () => {
    (prisma.job.groupBy as any).mockResolvedValue([
      { appliedDate: new Date(2026, 9, 2, 9), _count: { _all: 2 } },
    ]);
    (prisma.userSettings.findUnique as any).mockResolvedValue({
      settings: '{"ai":',
    });

    const result = await getDailyGoalValues("2026-10");

    expect(result).toEqual({
      success: true,
      data: { values: { "2026-10-02": { jobs: 2, hours: 0 } }, targets: {} },
    });
  });

  it.each(["2026-13", "abc", "2026-11", "2025-10"])(
    "rejects %s without querying",
    async (month) => {
      const result = await getDailyGoalValues(month);
      expect(result).toEqual({ success: false, message: "Invalid month." });
      expect(prisma.job.groupBy).not.toHaveBeenCalled();
      expect(prisma.activity.findMany).not.toHaveBeenCalled();
    },
  );

  it("accepts the oldest browsable month", async () => {
    const result = await getDailyGoalValues("2025-11");
    expect(result.success).toBe(true);
  });

  it("returns a failure when not signed in", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    const result = await getDailyGoalValues("2026-10");
    expect(result).toEqual({ success: false, message: "Not authenticated" });
  });
});

describe("updateGoalTargets", () => {
  const mockUser = { id: "user-id" };
  const stored = (settings: object) =>
    (prisma.userSettings.findUnique as any).mockResolvedValue({
      settings: JSON.stringify(settings),
    });
  const written = () =>
    JSON.parse((prisma.userSettings.upsert as any).mock.calls[0][0].update.settings);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.userSettings.findUnique as any).mockResolvedValue(null);
    (prisma.userSettings.upsert as any).mockResolvedValue({});
    (prisma.job.groupBy as any).mockResolvedValue([]);
    (prisma.activity.findMany as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes the current month and keeps the other settings", async () => {
    stored({
      ai: { provider: "ollama", model: "m" },
      display: { theme: "dark" },
      goals: { targets: { "2026-08": { jobs: 2, hours: 2 } } },
    });

    const result = await updateGoalTargets({ month: "2026-10", jobs: 3, hours: 6 });

    const targets = {
      "2026-08": { jobs: 2, hours: 2 },
      "2026-10": { jobs: 3, hours: 6 },
    };
    expect(result).toEqual(
      expect.objectContaining({ success: true, data: expect.objectContaining({ targets }) }),
    );
    expect((prisma.userSettings.upsert as any).mock.calls[0][0].where).toEqual({
      userId: "user-id",
    });
    expect(written()).toEqual({
      ai: { provider: "ollama", model: "m" },
      display: { theme: "dark" },
      goals: { targets },
    });
  });

  it("creates the settings row with defaults when none exists", async () => {
    await updateGoalTargets({ month: "2026-10", jobs: 3, hours: 6 });
    const create = JSON.parse(
      (prisma.userSettings.upsert as any).mock.calls[0][0].create.settings,
    );
    expect(create.goals).toEqual({ targets: { "2026-10": { jobs: 3, hours: 6 } } });
    expect(create.display).toEqual({ theme: "system" });
    expect((prisma.userSettings.upsert as any).mock.calls[0][0].create.userId).toBe(
      "user-id",
    );
  });

  it("overwrites an earlier save in the same month", async () => {
    stored({ goals: { targets: { "2026-10": { jobs: 9, hours: 9 } } } });
    await updateGoalTargets({ month: "2026-10", jobs: 3, hours: 6 });
    expect(written().goals.targets).toEqual({ "2026-10": { jobs: 3, hours: 6 } });
  });

  it("drops invalid stored entries on save", async () => {
    stored({ goals: { targets: { "2026-13": { jobs: 1, hours: 1 }, "2026-09": "x" } } });
    await updateGoalTargets({ month: "2026-10", jobs: 3, hours: 6 });
    expect(written().goals.targets).toEqual({ "2026-10": { jobs: 3, hours: 6 } });
  });

  it("refuses to save over malformed settings JSON", async () => {
    (prisma.userSettings.findUnique as any).mockResolvedValue({
      settings: '{"ai":',
    });
    const result = await updateGoalTargets({ month: "2026-10", jobs: 3, hours: 6 });
    expect(result.success).toBe(false);
    expect(prisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  it.each(["2026-09", "2026-11", "bad"])(
    "rejects a month that is no longer current (%s)",
    async (month) => {
      const result = await updateGoalTargets({ month, jobs: 3, hours: 6 });
      expect(result).toEqual({
        success: false,
        message: "The month has changed — reload the page.",
      });
      expect(prisma.userSettings.upsert).not.toHaveBeenCalled();
    },
  );

  it.each([
    { jobs: 0, hours: 4 },
    { jobs: 51, hours: 4 },
    { jobs: 2.5, hours: 4 },
    { jobs: 3, hours: 0 },
    { jobs: 3, hours: 25 },
    { jobs: Number.NaN, hours: 4 },
  ])("rejects out-of-range targets %o", async (targets) => {
    const result = await updateGoalTargets({ month: "2026-10", ...targets });
    expect(result).toEqual({ success: false, message: "Invalid goal targets." });
    expect(prisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  it("returns fresh streaks judged against the new targets", async () => {
    (prisma.job.groupBy as any).mockResolvedValue([
      { appliedDate: new Date(2026, 9, 5, 9), _count: { _all: 3 } },
    ]);
    (prisma.activity.findMany as any).mockResolvedValue([
      { startTime: new Date(2026, 9, 5, 10), duration: 360 },
    ]);
    const result = await updateGoalTargets({ month: "2026-10", jobs: 3, hours: 6 });
    expect(result).toEqual({
      success: true,
      data: {
        targets: { "2026-10": { jobs: 3, hours: 6 } },
        streaks: { current: 1, best: 1 },
      },
    });
  });

  it("still reports the save when the recount fails", async () => {
    (prisma.activity.findMany as any).mockRejectedValue(new Error("busy"));
    const result = await updateGoalTargets({ month: "2026-10", jobs: 3, hours: 6 });
    expect(result).toEqual({
      success: true,
      data: { targets: { "2026-10": { jobs: 3, hours: 6 } }, streaks: null },
    });
  });

  it("returns a failure when not signed in", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    const result = await updateGoalTargets({ month: "2026-10", jobs: 3, hours: 6 });
    expect(result).toEqual({ success: false, message: "Not authenticated" });
  });
});

describe("getGoalStreaks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    (getCurrentUser as any).mockResolvedValue({ id: "user-id" });
    (prisma.userSettings.findUnique as any).mockResolvedValue(null);
    (prisma.job.groupBy as any).mockResolvedValue([]);
    (prisma.activity.findMany as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scans the 12-month window through today for the user", async () => {
    await getGoalStreaks();
    const range = {
      gte: new Date(2025, 10, 1, 0, 0, 0, 0),
      lte: new Date(2026, 9, 5, 23, 59, 59, 999),
    };
    expect(prisma.job.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-id", applied: true, appliedDate: range },
      }),
    );
    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-id", startTime: range, duration: { not: null } },
      }),
    );
  });

  it("judges days against the stored targets", async () => {
    (prisma.userSettings.findUnique as any).mockResolvedValue({
      settings: JSON.stringify({ goals: { targets: { "2026-10": { jobs: 1, hours: 1 } } } }),
    });
    (prisma.job.groupBy as any).mockResolvedValue([
      { appliedDate: new Date(2026, 9, 4, 9), _count: { _all: 1 } },
      { appliedDate: new Date(2026, 9, 5, 9), _count: { _all: 1 } },
    ]);
    (prisma.activity.findMany as any).mockResolvedValue([
      { startTime: new Date(2026, 9, 4, 10), duration: 60 },
      { startTime: new Date(2026, 9, 5, 10), duration: 60 },
    ]);
    expect(await getGoalStreaks()).toEqual({
      success: true,
      data: { current: 2, best: 2 },
    });
  });

  it("counts against defaults when the settings JSON is malformed", async () => {
    (prisma.userSettings.findUnique as any).mockResolvedValue({
      settings: '{"ai":',
    });
    (prisma.job.groupBy as any).mockResolvedValue([
      { appliedDate: new Date(2026, 9, 5, 9), _count: { _all: 5 } },
    ]);
    (prisma.activity.findMany as any).mockResolvedValue([
      { startTime: new Date(2026, 9, 5, 10), duration: 240 },
    ]);
    expect(await getGoalStreaks()).toEqual({
      success: true,
      data: { current: 1, best: 1 },
    });
  });

  it("returns a failure when not signed in", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    expect(await getGoalStreaks()).toEqual({
      success: false,
      message: "Not authenticated",
    });
  });
});
