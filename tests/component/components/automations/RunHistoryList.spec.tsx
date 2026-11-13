import { render, screen, waitFor, act } from "@testing-library/react";
import { RunHistoryList } from "@/components/automations/RunHistoryList";
import type { AutomationRun } from "@/models/automation.model";

vi.mock("@/actions/automation.actions", () => ({
  deleteAutomationRun: vi.fn(),
}));

let intersectionCallback: IntersectionObserverCallback;
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

function makeRun(overrides: Partial<AutomationRun> = {}): AutomationRun {
  return {
    id: "run-1",
    automationId: "automation-1",
    jobsSearched: 10,
    jobsDeduplicated: 8,
    jobsProcessed: 8,
    jobsMatched: 3,
    jobsSaved: 2,
    status: "completed",
    errorMessage: null,
    blockedReason: null,
    funnelStats: null,
    startedAt: new Date("2024-06-01T10:00:00"),
    completedAt: new Date("2024-06-01T10:05:00"),
    ...overrides,
  };
}

function renderList(
  overrides: Partial<React.ComponentProps<typeof RunHistoryList>> = {},
) {
  const onLoadMore = vi.fn();
  const onDelete = vi.fn();
  const props: React.ComponentProps<typeof RunHistoryList> = {
    runs: [makeRun()],
    totalRuns: 1,
    loadingMore: false,
    onLoadMore,
    onDelete,
    ...overrides,
  };
  const result = render(<RunHistoryList {...props} />);
  return { ...result, onLoadMore, onDelete };
}

describe("RunHistoryList", () => {
  it("renders runs and the records-count summary", () => {
    const { container } = renderList({
      runs: [makeRun(), makeRun({ id: "run-2" })],
      totalRuns: 5,
    });

    expect(screen.getAllByText("completed")).toHaveLength(2);
    expect(
      container.textContent?.replace(/\s+/g, " "),
    ).toContain("Showing 1 to 2 of 5 runs");
  });

  it("does not render the load-more sentinel once every run is loaded", () => {
    renderList({ runs: [makeRun()], totalRuns: 1 });

    expect(
      screen.queryByTestId("runs-load-more-sentinel"),
    ).not.toBeInTheDocument();
  });

  it("calls onLoadMore when the sentinel scrolls into view and more runs remain", async () => {
    const { onLoadMore } = renderList({
      runs: [makeRun()],
      totalRuns: 5,
      loadingMore: false,
    });

    expect(screen.getByTestId("runs-load-more-sentinel")).toBeInTheDocument();

    await act(async () => {
      intersectionCallback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  it("does not call onLoadMore while a page is already loading", async () => {
    const { onLoadMore } = renderList({
      runs: [makeRun()],
      totalRuns: 5,
      loadingMore: true,
    });

    expect(screen.getByTestId("runs-load-more-spinner")).toBeInTheDocument();

    await act(async () => {
      intersectionCallback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not call onLoadMore when the sentinel is not intersecting", async () => {
    const { onLoadMore } = renderList({
      runs: [makeRun()],
      totalRuns: 5,
      loadingMore: false,
    });

    await act(async () => {
      intersectionCallback(
        [{ isIntersecting: false }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
