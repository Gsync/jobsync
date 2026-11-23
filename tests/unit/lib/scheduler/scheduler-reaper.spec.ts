import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient({} as never);

vi.mock("@/generated/prisma/client", () => {
  const m = {
    automationRun: { updateMany: vi.fn() },
    automation: { count: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  };
  return {
    PrismaClient: vi.fn(function () {
      return m;
    }),
  };
});

vi.mock("node-cron", () => ({
  default: { schedule: vi.fn(), validate: vi.fn(() => true) },
}));

vi.mock("@/lib/notifications/prune", () => ({ pruneNotifications: vi.fn() }));
vi.mock("@/lib/aiUsage/prune", () => ({ pruneAiCalls: vi.fn() }));

import cron from "node-cron";
import { pruneNotifications } from "@/lib/notifications/prune";
import { pruneAiCalls } from "@/lib/aiUsage/prune";
import { reapStaleRuns, startScheduler, stopScheduler } from "@/lib/scheduler";

describe("reapStaleRuns", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flips stale running rows to failed", async () => {
    (prisma.automationRun.updateMany as any).mockResolvedValue({ count: 2 });

    const count = await reapStaleRuns();
    expect(count).toBe(2);

    const arg = (prisma.automationRun.updateMany as any).mock.calls[0][0];
    expect(arg.where.status).toBe("running");
    expect(arg.where.startedAt.lt).toBeInstanceOf(Date);
    expect(arg.data.status).toBe("failed");
    expect(arg.data.errorMessage).toBe("interrupted");
  });

  it("returns 0 when nothing is stale", async () => {
    (prisma.automationRun.updateMany as any).mockResolvedValue({ count: 0 });
    expect(await reapStaleRuns()).toBe(0);
  });
});

describe("scheduler pruning", () => {
  beforeEach(() => vi.clearAllMocks());

  it("24e7baff: prunes once a day at 03:00, not on every hourly automation tick", async () => {
    startScheduler();
    const jobs = vi.mocked(cron.schedule).mock.calls;
    const hourly = jobs.find(([expression]) => expression === "0 * * * *");
    const daily = jobs.find(([expression]) => expression === "0 3 * * *");
    expect(hourly).toBeDefined();
    expect(daily).toBeDefined();

    await (hourly![1] as () => Promise<void>)();
    expect(pruneNotifications).not.toHaveBeenCalled();
    expect(pruneAiCalls).not.toHaveBeenCalled();

    await (daily![1] as () => Promise<void>)();
    expect(pruneNotifications).toHaveBeenCalledTimes(1);
    expect(pruneAiCalls).toHaveBeenCalledTimes(1);
    stopScheduler();
  });
});
