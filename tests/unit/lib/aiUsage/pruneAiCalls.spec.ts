import { pruneAiCalls, aiUsageCutoff } from "@/lib/aiUsage/prune";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: { aiCall: { deleteMany: vi.fn() } },
}));
vi.mock("@/lib/telemetry", () => ({ log: { info: vi.fn(), error: vi.fn() } }));

const db = prisma as any;
const now = new Date("2026-09-28T12:00:00Z");

it("cuts off exactly 90 days back", () => {
  expect(aiUsageCutoff(now).toISOString()).toBe("2026-06-30T12:00:00.000Z");
});

it("deletes rows older than the cutoff", async () => {
  db.aiCall.deleteMany.mockResolvedValue({ count: 4 });
  await expect(pruneAiCalls(now)).resolves.toBe(4);
  expect(db.aiCall.deleteMany).toHaveBeenCalledWith({
    where: { startedAt: { lt: aiUsageCutoff(now) } },
  });
});

it("never throws", async () => {
  db.aiCall.deleteMany.mockRejectedValue(new Error("locked"));
  await expect(pruneAiCalls(now)).resolves.toBe(0);
});
