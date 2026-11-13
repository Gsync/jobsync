import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { NotificationBell } from "@/components/notifications/NotificationBell";

vi.mock("@/actions/notification.actions", () => ({
  getPopoverNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  dismissNotification: vi.fn(),
}));
vi.mock("@/context/NotificationContext", () => ({
  useNotifications: () => ({ summary: { unread: 2, unreadErrors: 1 }, refresh: vi.fn() }),
}));
import * as actions from "@/actions/notification.actions";

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
const readRun = { ...run, id: "r2", readAt: at };

// A dark-mode tint without a light pair is unreadable on a white popover.
const darkOnlyTints = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("[class]"))
    .flatMap((el) => el.getAttribute("class")!.split(/\s+/))
    .filter((c) => /^(hover:)?(bg|text|border)-(red|green|blue)-(300|400|900|950)/.test(c));

it("rows pair every dark tint with a light one", () => {
  const { container } = render(
    <ul>
      {[run, board, readRun].flatMap((item) =>
        (["popover", "page"] as const).map((variant) => (
          <NotificationRow key={item.id + variant} item={item as any} variant={variant} onRemove={vi.fn()} onOpenLink={vi.fn()} />
        )),
      )}
    </ul>,
  );
  expect(darkOnlyTints(container)).toEqual([]);
});

it("the bell popover pairs every dark tint with a light one", async () => {
  (actions.getPopoverNotifications as any).mockResolvedValue({ success: true, data: [board, run] });
  render(<NotificationBell />);
  await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
  await screen.findByText("Job board unreachable");
  expect(darkOnlyTints(document.body)).toEqual([]);
});
