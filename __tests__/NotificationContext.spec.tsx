import { render, screen, act, waitFor } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "@/context/NotificationContext";
import { getNotificationSummary } from "@/actions/notification.actions";

vi.mock("@/actions/notification.actions", () => ({
  getNotificationSummary: vi.fn(),
}));
let pathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function Probe() {
  const { summary } = useNotifications();
  return <span>unread:{summary.unread}</span>;
}

beforeEach(() => {
  vi.clearAllMocks();
  (getNotificationSummary as any).mockResolvedValue({
    success: true,
    data: { unread: 2, unreadErrors: 1 },
  });
});

it("loads the summary on mount", async () => {
  render(<NotificationProvider><Probe /></NotificationProvider>);
  expect(await screen.findByText("unread:2")).toBeInTheDocument();
});

it("refetches on navigation and on focus, never on a timer", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { rerender } = render(<NotificationProvider><Probe /></NotificationProvider>);
  await waitFor(() => expect(getNotificationSummary).toHaveBeenCalledTimes(1));

  await act(async () => { vi.advanceTimersByTime(10 * 60 * 1000); });
  expect(getNotificationSummary).toHaveBeenCalledTimes(1);

  pathname = "/dashboard/myjobs";
  rerender(<NotificationProvider><Probe /></NotificationProvider>);
  await waitFor(() => expect(getNotificationSummary).toHaveBeenCalledTimes(2));

  await act(async () => { window.dispatchEvent(new Event("focus")); });
  await waitFor(() => expect(getNotificationSummary).toHaveBeenCalledTimes(3));
  vi.useRealTimers();
});

it("is a safe no-op without a provider", () => {
  render(<Probe />);
  expect(screen.getByText("unread:0")).toBeInTheDocument();
});
