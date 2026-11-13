import { getAiUsage } from "@/actions/aiUsage.actions";
import prisma from "@/lib/db";
import { requireUser } from "@/actions/shared";

vi.mock("@/lib/db", () => ({
  default: { aiCall: { findMany: vi.fn(), count: vi.fn() } },
}));
vi.mock("@/actions/shared", () => ({ requireUser: vi.fn() }));

const db = prisma as any;
const since = new Date("2026-09-22T04:00:00Z");

describe("getAiUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
    (requireUser as any).mockResolvedValue({ id: "user-1" });
    db.aiCall.findMany.mockResolvedValue([]);
    db.aiCall.count.mockResolvedValue(3);
  });
  afterEach(() => vi.useRealTimers());

  it("scopes every query to the user", async () => {
    await getAiUsage({ rangeDays: 7, since, timeZone: "America/Toronto" });
    for (const [arg] of [...db.aiCall.findMany.mock.calls, ...db.aiCall.count.mock.calls]) {
      expect(arg.where.userId).toBe("user-1");
    }
  });

  it("counts the previous period immediately before since", async () => {
    const res = await getAiUsage({ rangeDays: 7, since, timeZone: "America/Toronto" });
    expect(db.aiCall.count).toHaveBeenCalledWith({
      where: { userId: "user-1", startedAt: { gte: new Date("2026-09-15T04:00:00Z"), lt: since } },
    });
    expect(res.success && res.data.totals.previousCalls).toBe(3);
  });

  it("reads the last 50 within retention for Recent calls", async () => {
    await getAiUsage({ rangeDays: 30, since, timeZone: "UTC" });
    const recentCall = db.aiCall.findMany.mock.calls.find(([a]: any) => a.take === 50);
    expect(recentCall[0].orderBy).toEqual({ startedAt: "desc" });
    expect(recentCall[0].where.startedAt.gte).toEqual(new Date("2026-06-30T12:00:00Z"));
  });

  it("rejects a range other than 7 or 30 and an unknown timezone falls back to UTC", async () => {
    expect((await getAiUsage({ rangeDays: 90 as any, since, timeZone: "UTC" })).success).toBe(false);
    expect((await getAiUsage({ rangeDays: 7, since, timeZone: "Not/AZone" })).success).toBe(true);
  });

  it("clamps a since further back than the range allows", async () => {
    await getAiUsage({ rangeDays: 7, since: new Date("2020-01-01T00:00:00Z"), timeZone: "UTC" });
    const rangeCall = db.aiCall.findMany.mock.calls.find(([a]: any) => a.take === undefined);
    expect(rangeCall[0].where.startedAt.gte.getTime()).toBeGreaterThan(new Date("2026-09-20T00:00:00Z").getTime());
  });

  it("returns the not-authenticated failure", async () => {
    (requireUser as any).mockRejectedValue(new Error("Not authenticated"));
    expect(await getAiUsage({ rangeDays: 7, since, timeZone: "UTC" })).toEqual({ success: false, message: "Not authenticated" });
  });
});
