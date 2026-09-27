import {
  getNotificationSummary,
  getPopoverNotifications,
  getNotificationList,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  deleteNotification,
  clearReadNotifications,
} from "@/actions/notification.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    notification: {
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as any).mockResolvedValue(user);
  db.notification.count.mockResolvedValue(0);
  db.notification.findMany.mockResolvedValue([]);
  db.notification.updateMany.mockResolvedValue({ count: 1 });
  db.notification.deleteMany.mockResolvedValue({ count: 1 });
});

describe("reads", () => {
  it("summary counts unread within the retention window, errors separately", async () => {
    db.notification.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    const res = await getNotificationSummary();
    expect(res).toEqual({ success: true, data: { unread: 3, unreadErrors: 1 } });
    const [all, errors] = db.notification.count.mock.calls.map((c: any) => c[0].where);
    expect(all).toMatchObject({ userId: "user-1", readAt: null });
    expect(all.occurredAt.gte).toBeInstanceOf(Date);
    expect(errors.kind).toEqual({ in: ["error", "board"] });
  });

  it("popover excludes dismissed rows and orders newest first", async () => {
    await getPopoverNotifications();
    const args = db.notification.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ userId: "user-1", dismissedAt: null });
    expect(args.where.occurredAt.gte).toBeInstanceOf(Date);
    expect(args.orderBy).toEqual([{ occurredAt: "desc" }, { id: "desc" }]);
    expect(args.take).toBe(20);
  });

  it("parses the payload JSON", async () => {
    db.notification.findMany.mockResolvedValue([
      { id: "n1", kind: "run", payload: '{"jobsSaved":2}', automation: { id: "a", name: "A" } },
    ]);
    const res: any = await getPopoverNotifications();
    expect(res.data[0].payload).toEqual({ jobsSaved: 2 });
  });

  it("page list includes dismissed rows and filters by tab and automation", async () => {
    await getNotificationList({ tab: "errors", automationId: "a-1" });
    const where = db.notification.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("dismissedAt");
    expect(where).toMatchObject({
      userId: "user-1",
      automationId: "a-1",
      kind: { in: ["error", "board"] },
    });
  });

  it("unread tab filters readAt null", async () => {
    await getNotificationList({ tab: "unread" });
    expect(db.notification.findMany.mock.calls[0][0].where.readAt).toBeNull();
  });
});

describe("mutations are scoped to the user", () => {
  it("mark read", async () => {
    await markNotificationRead("n-1");
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n-1", userId: "user-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("dismiss also marks read so the badge matches the popover", async () => {
    await dismissNotification("n-1");
    const { where, data } = db.notification.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: "n-1", userId: "user-1" });
    expect(data.dismissedAt).toBeInstanceOf(Date);
    expect(data.readAt).toBeInstanceOf(Date);
  });

  it("another user's id is a no-op, not an error", async () => {
    db.notification.updateMany.mockResolvedValue({ count: 0 });
    await expect(dismissNotification("someone-elses")).resolves.toEqual({ success: true });
  });

  it("delete", async () => {
    await deleteNotification("n-1");
    expect(db.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: "n-1", userId: "user-1" },
    });
  });

  it("mark all read", async () => {
    await markAllNotificationsRead();
    expect(db.notification.updateMany.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      readAt: null,
    });
  });

  it("clear read deletes only read rows", async () => {
    await clearReadNotifications();
    expect(db.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: { not: null } },
    });
  });

  it("unauthenticated returns a failure", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    const res: any = await deleteNotification("n-1");
    expect(res.success).toBe(false);
    expect(db.notification.deleteMany).not.toHaveBeenCalled();
  });
});
