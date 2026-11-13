import {
  startBreak,
  endBreak,
  updateBreakLength,
  stopActivityById,
} from "@/actions/activity.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient({} as never);

vi.mock("@/generated/prisma/client", () => {
  const mPrismaClient = {
    activity: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockUser = { id: "user-id" };

const runningActivity = {
  id: "act-1",
  userId: "user-id",
  activityName: "Coding",
  startTime: new Date("2026-08-13T09:00:00Z"),
  endTime: null,
  duration: null,
  breakMinutes: 0,
  breakStartedAt: null,
  breakPlannedMins: null,
};

// File scope, not inside the describe: Task 3 appends a sibling describe, and
// vitest's clearMocks only clears calls — a nested beforeEach would leave that
// block passing purely because this one leaked its implementations into it.
beforeEach(() => {
  (getCurrentUser as any).mockResolvedValue(mockUser);
  (prisma.activity.update as any).mockImplementation(
    ({ data }: any) => Promise.resolve({ ...runningActivity, ...data }),
  );
});

describe("activity break actions", () => {
  describe("startBreak", () => {
    it("opens a break scoped to the current user", async () => {
      (prisma.activity.findFirst as any).mockResolvedValue(runningActivity);

      const res = await startBreak("act-1", 15);

      expect(res.success).toBe(true);
      expect(prisma.activity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "act-1", userId: "user-id", endTime: null },
        }),
      );
      const { where, data } = (prisma.activity.update as any).mock.calls[0][0];
      expect(where).toEqual({ id: "act-1", userId: "user-id" });
      expect(data.breakStartedAt).toBeInstanceOf(Date);
      expect(data.breakPlannedMins).toBe(15);
    });

    it("clamps the planned length to the allowed range", async () => {
      (prisma.activity.findFirst as any).mockResolvedValue(runningActivity);

      await startBreak("act-1", 999);

      const { data } = (prisma.activity.update as any).mock.calls[0][0];
      expect(data.breakPlannedMins).toBe(60);
    });

    it("refuses when a break is already open", async () => {
      (prisma.activity.findFirst as any).mockResolvedValue({
        ...runningActivity,
        breakStartedAt: new Date(),
      });

      const res = await startBreak("act-1", 15);

      expect(res.success).toBe(false);
      expect(prisma.activity.update).not.toHaveBeenCalled();
    });

    it("fails when the activity is not the caller's running activity", async () => {
      (prisma.activity.findFirst as any).mockResolvedValue(null);

      const res = await startBreak("act-1", 15);

      expect(res.success).toBe(false);
      expect(prisma.activity.update).not.toHaveBeenCalled();
    });
  });

  describe("endBreak", () => {
    it("adds the elapsed break time to breakMinutes and clears the break", async () => {
      (prisma.activity.findFirst as any).mockResolvedValue({
        ...runningActivity,
        breakMinutes: 10,
        breakStartedAt: new Date(Date.now() - 12 * 60 * 1000),
        breakPlannedMins: 15,
      });

      const res = await endBreak("act-1");

      expect(res.success).toBe(true);
      const { data } = (prisma.activity.update as any).mock.calls[0][0];
      expect(data.breakMinutes).toBe(22);
      expect(data.breakStartedAt).toBeNull();
      expect(data.breakPlannedMins).toBeNull();
    });

    it("is a no-op when no break is open", async () => {
      (prisma.activity.findFirst as any).mockResolvedValue(runningActivity);

      const res = await endBreak("act-1");

      expect(res.success).toBe(true);
      expect(prisma.activity.update).not.toHaveBeenCalled();
    });
  });

  describe("updateBreakLength", () => {
    it("changes the planned length of an open break", async () => {
      (prisma.activity.findFirst as any).mockResolvedValue({
        ...runningActivity,
        breakStartedAt: new Date(),
        breakPlannedMins: 15,
      });

      await updateBreakLength("act-1", 30);

      const { data } = (prisma.activity.update as any).mock.calls[0][0];
      expect(data).toEqual({ breakPlannedMins: 30 });
    });

    it("refuses when no break is open", async () => {
      (prisma.activity.findFirst as any).mockResolvedValue(runningActivity);

      const res = await updateBreakLength("act-1", 30);

      expect(res.success).toBe(false);
      expect(prisma.activity.update).not.toHaveBeenCalled();
    });
  });
});

describe("stopActivityById", () => {
  const stoppedAt = new Date("2026-08-13T11:00:00Z"); // 2h after startTime

  beforeEach(() => {
    (prisma.activity.delete as any).mockResolvedValue({ id: "act-1" });
  });

  it("subtracts completed break minutes from the wall clock", async () => {
    (prisma.activity.findFirst as any).mockResolvedValue({
      ...runningActivity,
      breakMinutes: 25,
    });

    const res = await stopActivityById("act-1", stoppedAt);

    expect(res.success).toBe(true);
    expect(res.discarded).toBe(false);
    const { data } = (prisma.activity.update as any).mock.calls[0][0];
    expect(data.duration).toBe(95); // 120 wall - 25 break
    expect(data.breakMinutes).toBe(25);
    expect(data.endTime).toEqual(stoppedAt);
  });

  it("closes an open break at stop time and counts it", async () => {
    (prisma.activity.findFirst as any).mockResolvedValue({
      ...runningActivity,
      breakMinutes: 10,
      breakStartedAt: new Date("2026-08-13T10:40:00Z"), // 20 min before stop
      breakPlannedMins: 15,
    });

    await stopActivityById("act-1", stoppedAt);

    const { data } = (prisma.activity.update as any).mock.calls[0][0];
    expect(data.duration).toBe(90); // 120 wall - (10 + 20) break
    expect(data.breakMinutes).toBe(30);
    expect(data.breakStartedAt).toBeNull();
    expect(data.breakPlannedMins).toBeNull();
  });

  it("caps net work at the 8h maximum after subtracting breaks", async () => {
    (prisma.activity.findFirst as any).mockResolvedValue({
      ...runningActivity,
      breakMinutes: 60,
    });

    await stopActivityById("act-1", new Date("2026-08-14T09:00:00Z")); // 24h

    const { data } = (prisma.activity.update as any).mock.calls[0][0];
    expect(data.duration).toBe(480); // min(1440 - 60, 480)
  });

  // Decision 7: capping before subtracting made this 0 and deleted the row.
  it("saves the real work time when a break was left open across a long absence", async () => {
    (prisma.activity.findFirst as any).mockResolvedValue({
      ...runningActivity,
      breakMinutes: 0,
      breakStartedAt: new Date("2026-08-13T13:00:00Z"), // 4h in, then away
      breakPlannedMins: 15,
    });

    await stopActivityById("act-1", new Date("2026-08-14T09:00:00Z")); // 24h

    const { data } = (prisma.activity.update as any).mock.calls[0][0];
    expect(data.duration).toBe(240); // min(1440 - 1200, 480)
    expect(data.breakMinutes).toBe(1200);
  });

  it("looks up only the running activity, never a saved one", async () => {
    (prisma.activity.findFirst as any).mockResolvedValue(runningActivity);

    await stopActivityById("act-1", stoppedAt);

    expect(prisma.activity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "act-1", userId: "user-id", endTime: null },
      }),
    );
  });

  it("deletes the activity when net duration is under the minimum", async () => {
    (prisma.activity.findFirst as any).mockResolvedValue({
      ...runningActivity,
      breakMinutes: 119, // 120 wall - 119 break = 1 minute of work
    });

    const res = await stopActivityById("act-1", stoppedAt);

    expect(res).toEqual({ success: true, discarded: true });
    expect(prisma.activity.delete).toHaveBeenCalledWith({
      where: { id: "act-1", userId: "user-id" },
    });
    expect(prisma.activity.update).not.toHaveBeenCalled();
  });

  it("never writes a negative duration", async () => {
    (prisma.activity.findFirst as any).mockResolvedValue({
      ...runningActivity,
      breakMinutes: 500,
    });

    const res = await stopActivityById("act-1", stoppedAt);

    expect(res.discarded).toBe(true);
    expect(prisma.activity.update).not.toHaveBeenCalled();
  });

  it("fails when the activity does not belong to the caller", async () => {
    (prisma.activity.findFirst as any).mockResolvedValue(null);

    const res = await stopActivityById("act-1", stoppedAt);

    expect(res.success).toBe(false);
    expect(prisma.activity.update).not.toHaveBeenCalled();
    expect(prisma.activity.delete).not.toHaveBeenCalled();
  });
});
