import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import * as actions from "@/actions/notification.actions";
import { useNotifications } from "@/context/NotificationContext";

vi.mock("@/actions/notification.actions", () => ({
  getPopoverNotifications: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue({ success: true }),
  markAllNotificationsRead: vi.fn().mockResolvedValue({ success: true }),
  dismissNotification: vi.fn().mockResolvedValue({ success: true }),
  dismissAllNotifications: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/context/NotificationContext", () => ({ useNotifications: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, onClick }: any) => <a href={href} onClick={(e) => { e.preventDefault(); onClick?.(e); }}>{children}</a>,
}));

const refresh = vi.fn();
const at = new Date();
const run = {
  id: "r1", kind: "run", occurrences: 1, occurredAt: at, createdAt: at, readAt: null, dismissedAt: null,
  automation: { id: "a-1", name: "Remote Frontend" },
  payload: { status: "completed", jobsSearched: 38, jobsSaved: 12, belowThreshold: 0, boardsFailed: 0, aiError: null },
};
const board = {
  ...run, id: "b1", kind: "board",
  payload: { provider: "Greenhouse", token: "northwind", companyName: "Northwind", code: "not_found", reason: "Board 'northwind' returned 404" },
};

beforeEach(() => {
  vi.clearAllMocks();
  (useNotifications as any).mockReturnValue({ summary: { unread: 2, unreadErrors: 1 }, refresh });
  (actions.getPopoverNotifications as any).mockResolvedValue({ success: true, data: [board, run] });
});

it("shows a red count when any unread is an error", () => {
  render(<NotificationBell />);
  const badge = screen.getByTestId("notification-badge");
  expect(badge).toHaveTextContent("2");
  expect(badge.className).toMatch(/destructive/);
});

it("shows a blue count when unread are only runs", () => {
  (useNotifications as any).mockReturnValue({ summary: { unread: 1, unreadErrors: 0 }, refresh });
  render(<NotificationBell />);
  expect(screen.getByTestId("notification-badge").className).toMatch(/primary/);
});

it("hides the badge when nothing is unread", () => {
  (useNotifications as any).mockReturnValue({ summary: { unread: 0, unreadErrors: 0 }, refresh });
  render(<NotificationBell />);
  expect(screen.queryByTestId("notification-badge")).toBeNull();
});

it("opening does not mark anything read", async () => {
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  expect(await screen.findByText("Job board unreachable")).toBeInTheDocument();
  expect(actions.markNotificationRead).not.toHaveBeenCalled();
  expect(actions.markAllNotificationsRead).not.toHaveBeenCalled();
});

it("Errors tab filters to error rows", async () => {
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  await userEvent.click(await screen.findByRole("tab", { name: /errors/i }));
  expect(screen.getByText("Job board unreachable")).toBeInTheDocument();
  expect(screen.queryByText("“Remote Frontend” finished")).toBeNull();
});

it("× dismisses, removes the row and refreshes the badge", async () => {
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  const row = (await screen.findByText("Job board unreachable")).closest("li")!;
  await userEvent.click(within(row).getByRole("button", { name: /dismiss/i }));
  expect(actions.dismissNotification).toHaveBeenCalledWith("b1");
  expect(screen.queryByText("Job board unreachable")).toBeNull();
  expect(refresh).toHaveBeenCalled();
});

it("clicking a row link marks it read", async () => {
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  await userEvent.click(await screen.findByText("Review 12 new jobs"));
  expect(actions.markNotificationRead).toHaveBeenCalledWith("r1");
  expect(refresh).toHaveBeenCalled();
});

it("Mark all read marks all and refreshes", async () => {
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  await userEvent.click(await screen.findByRole("button", { name: /mark all read/i }));
  expect(actions.markAllNotificationsRead).toHaveBeenCalled();
  expect(refresh).toHaveBeenCalled();
});

it("Clear all dismisses every row and refreshes the badge", async () => {
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  await userEvent.click(await screen.findByRole("button", { name: /clear all/i }));
  expect(actions.dismissAllNotifications).toHaveBeenCalled();
  expect(screen.getByText("You’re all caught up.")).toBeInTheDocument();
  expect(refresh).toHaveBeenCalled();
});

it("shows the empty state", async () => {
  (actions.getPopoverNotifications as any).mockResolvedValue({ success: true, data: [] });
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  expect(await screen.findByText("You’re all caught up.")).toBeInTheDocument();
});
