import { useState } from "react";
import { act, render, screen, within } from "@testing-library/react";
import { toastError } from "@/lib/toast";
import userEvent from "@testing-library/user-event";
import { NotificationsContainer } from "@/components/notifications/NotificationsContainer";
import * as actions from "@/actions/notification.actions";
import { useNotifications } from "@/context/NotificationContext";

vi.mock("@/actions/notification.actions", () => ({
  getNotificationList: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue({ success: true }),
  markAllNotificationsRead: vi.fn().mockResolvedValue({ success: true }),
  deleteNotification: vi.fn().mockResolvedValue({ success: true }),
  clearReadNotifications: vi.fn().mockResolvedValue({ success: true }),
  dismissNotification: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/context/NotificationContext", () => ({ useNotifications: vi.fn() }));
let setTabFromUrl: (t: string) => void = () => {};
vi.mock("@/hooks/useTabQueryParam", () => ({
  useTabQueryParam: (_tabs: readonly string[], def: string) => {
    const state = useState(def);
    setTabFromUrl = state[1];
    return state;
  },
}));
vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, onClick }: any) => <a href={href} onClick={(e) => { e.preventDefault(); onClick?.(e); }}>{children}</a>,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

const refresh = vi.fn();
const now = new Date();
const old = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
const runPayload = { status: "completed", jobsSearched: 38, jobsSaved: 12, belowThreshold: 0, boardsFailed: 0, aiError: null };
const run = {
  id: "r1", kind: "run", occurrences: 1, occurredAt: now, createdAt: now, readAt: null, dismissedAt: null,
  automation: { id: "a-1", name: "Remote Frontend" }, payload: runPayload,
};
const board = {
  ...run, id: "b1", kind: "board", occurredAt: old, createdAt: old, readAt: old, dismissedAt: old,
  automation: { id: "a-2", name: "Backend EU" },
  payload: { provider: "Greenhouse", token: "northwind", companyName: "Northwind", code: "not_found", reason: "Board 'northwind' returned 404" },
};
const counts = { all: 2, unread: 1, errors: 1, runs: 1 };
const initial = { items: [run, board] as any, total: 2, counts };
const automations = [{ id: "a-1", name: "Remote Frontend" }, { id: "a-2", name: "Backend EU" }];

const renderPage = (init = initial) =>
  render(<NotificationsContainer initial={init} automations={automations} />);

beforeEach(() => {
  vi.clearAllMocks();
  (useNotifications as any).mockReturnValue({ summary: { unread: 1, unreadErrors: 0 }, refresh });
  (actions.getNotificationList as any).mockResolvedValue({ success: true, data: initial });
});

it("renders day groups and every tab with its count", () => {
  renderPage();
  expect(screen.getByText("Today")).toBeInTheDocument();
  expect(screen.getByText("Earlier")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /All\s*2/ })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /Unread\s*1/ })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /Errors\s*1/ })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /Runs\s*1/ })).toBeInTheDocument();
});

it("re-queries when a tab is picked", async () => {
  renderPage();
  await userEvent.click(screen.getByRole("tab", { name: /Errors/ }));
  expect(actions.getNotificationList).toHaveBeenCalledWith({ tab: "errors", automationId: undefined, skip: 0 });
});

it("re-queries with the picked automation", async () => {
  renderPage();
  await userEvent.selectOptions(screen.getByRole("combobox"), "a-2");
  expect(actions.getNotificationList).toHaveBeenCalledWith({ tab: "all", automationId: "a-2", skip: 0 });
});

it("row × deletes the row, not dismisses it", async () => {
  renderPage();
  const row = screen.getByText("Remote Frontend", { selector: "li span" }).closest("li")!;
  await userEvent.click(within(row).getByRole("button", { name: /delete notification/i }));
  expect(actions.deleteNotification).toHaveBeenCalledWith("r1");
  expect(actions.dismissNotification).not.toHaveBeenCalled();
  expect(screen.queryByText("Remote Frontend", { selector: "li span" })).toBeNull();
  expect(refresh).toHaveBeenCalled();
});

it("Clear read deletes read rows from the list", async () => {
  (actions.getNotificationList as any).mockResolvedValue({
    success: true, data: { items: [run], total: 1, counts: { all: 1, unread: 1, errors: 0, runs: 1 } },
  });
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: /clear read/i }));
  expect(actions.clearReadNotifications).toHaveBeenCalled();
  expect(await screen.findByRole("tab", { name: /All\s*1/ })).toBeInTheDocument();
  expect(screen.queryByText("Backend EU", { selector: "li span" })).toBeNull();
  expect(refresh).toHaveBeenCalled();
});

it("Mark all read removes every unread dot", async () => {
  renderPage();
  expect(screen.getAllByLabelText("Unread").length).toBe(1);
  await userEvent.click(screen.getByRole("button", { name: /mark all read/i }));
  expect(actions.markAllNotificationsRead).toHaveBeenCalled();
  expect(screen.queryAllByLabelText("Unread")).toHaveLength(0);
  expect(refresh).toHaveBeenCalled();
});

it("Load more appends the next page", async () => {
  const more = { ...run, id: "r2", automation: { id: "a-3", name: "Data Roles" } };
  (actions.getNotificationList as any).mockResolvedValue({
    success: true, data: { items: [more], total: 3, counts: { ...counts, all: 3 } },
  });
  renderPage({ ...initial, total: 3 });
  await userEvent.click(screen.getByRole("button", { name: /load more/i }));
  expect(actions.getNotificationList).toHaveBeenCalledWith({ tab: "all", automationId: undefined, skip: 2 });
  expect(await screen.findByText("Data Roles", { selector: "li span" })).toBeInTheDocument();
  expect(screen.getByText("Remote Frontend", { selector: "li span" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
});

it("hides Load more when everything is loaded", () => {
  renderPage();
  expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
});

it("still shows a row dismissed from the popover", () => {
  renderPage();
  expect(screen.getByText("Backend EU", { selector: "li span" })).toBeInTheDocument();
});

it("opening a row link marks it read", async () => {
  renderPage();
  await userEvent.click(screen.getByRole("link", { name: /review 12 new jobs/i }));
  expect(actions.markNotificationRead).toHaveBeenCalledWith("r1");
  expect(refresh).toHaveBeenCalled();
});

it("shows the empty state", () => {
  renderPage({ items: [], total: 0, counts: { all: 0, unread: 0, errors: 0, runs: 0 } });
  expect(screen.getByText("No notifications")).toBeInTheDocument();
  expect(screen.getByText("Automation results will appear here after the next run.")).toBeInTheDocument();
});

it("re-queries when the URL changes the tab without a remount", async () => {
  renderPage();
  await userEvent.click(screen.getByRole("tab", { name: /Errors/ }));
  vi.mocked(actions.getNotificationList).mockClear();
  await act(async () => setTabFromUrl("all"));
  expect(actions.getNotificationList).toHaveBeenCalledWith({ tab: "all", automationId: undefined, skip: 0 });
});

it("a failed delete shows an error and restores the row", async () => {
  (actions.deleteNotification as any).mockResolvedValueOnce({ success: false, message: "Not authenticated" });
  renderPage();
  const row = screen.getByText("Remote Frontend", { selector: "li span" }).closest("li")!;
  await userEvent.click(within(row).getByRole("button", { name: /delete notification/i }));
  expect(toastError).toHaveBeenCalledWith("Not authenticated");
  expect(await screen.findByText("Remote Frontend", { selector: "li span" })).toBeInTheDocument();
});

it("a failed mark all read shows an error and keeps the unread dots", async () => {
  (actions.markAllNotificationsRead as any).mockResolvedValueOnce({ success: false, message: "Busy" });
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: /mark all read/i }));
  expect(toastError).toHaveBeenCalledWith("Busy");
  expect(screen.getAllByLabelText("Unread")).toHaveLength(1);
});

it("a failed clear read shows an error", async () => {
  (actions.clearReadNotifications as any).mockResolvedValueOnce({ success: false, message: "Busy" });
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: /clear read/i }));
  expect(toastError).toHaveBeenCalledWith("Busy");
  expect(screen.getByText("Backend EU", { selector: "li span" })).toBeInTheDocument();
});

it("keeps the page row's fixed columns off phone widths", () => {
  renderPage();
  const row = screen.getByText("Remote Frontend", { selector: "li span" }).closest("li")!;
  const fixed = row.querySelectorAll(".shrink-0.hidden");
  expect(fixed.length).toBe(2);
  fixed.forEach((el) => expect(el.className).toMatch(/sm:block/));
  expect(within(row).getByTestId("row-meta-mobile").className).toMatch(/sm:hidden/);
});
