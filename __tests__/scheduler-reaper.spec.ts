import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const m = {
    automationRun: { updateMany: vi.fn() },
    automation: { count: vi.fn() },
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

import { reapStaleRuns } from "@/lib/scheduler";

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
