import { pruneNotifications, notificationCutoff } from "@/lib/notifications/prune";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: { notification: { deleteMany: vi.fn() } },
}));
vi.mock("@/lib/telemetry", () => ({ log: { info: vi.fn(), error: vi.fn() } }));

const db = prisma as any;
const now = new Date("2026-09-26T12:00:00Z");

it("cuts off exactly 30 days back", () => {
  expect(notificationCutoff(now).toISOString()).toBe("2026-08-27T12:00:00.000Z");
});

it("deletes rows older than the cutoff", async () => {
  db.notification.deleteMany.mockResolvedValue({ count: 3 });
  await expect(pruneNotifications(now)).resolves.toBe(3);
  expect(db.notification.deleteMany).toHaveBeenCalledWith({
    where: { occurredAt: { lt: notificationCutoff(now) } },
  });
});

it("never throws", async () => {
  db.notification.deleteMany.mockRejectedValue(new Error("locked"));
  await expect(pruneNotifications(now)).resolves.toBe(0);
});
