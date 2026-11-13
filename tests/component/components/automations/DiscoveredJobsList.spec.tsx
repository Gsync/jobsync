import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoveredJobsList } from "@/components/automations/DiscoveredJobsList";
import type { DiscoveredJob } from "@/models/automation.model";

vi.mock("@/actions/automation.actions", () => ({
  acceptDiscoveredJob: vi.fn(),
  dismissDiscoveredJob: vi.fn(),
  analyzeDiscoveredJob: vi.fn(),
  clearDiscoveredJobs: vi.fn(),
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

function makeJob(overrides: Partial<DiscoveredJob> = {}): DiscoveredJob {
  return {
    id: "job-1",
    userId: "user-1",
    automationId: "automation-1",
    jobUrl: null,
    description: "desc",
    jobType: "full-time",
    createdAt: new Date("2024-06-01"),
    jobTitleId: "title-1",
    companyId: "company-1",
    locationId: "location-1",
    matchScore: 80,
    matchData: null,
    discoveryStatus: "new",
    discoveredAt: new Date("2024-06-01"),
    JobTitle: { label: "Software Engineer" },
    Company: { label: "Acme Corp" },
    Location: { label: "Remote" },
    ...overrides,
  };
}

function renderList(
  overrides: Partial<React.ComponentProps<typeof DiscoveredJobsList>> = {},
) {
  const onLoadMore = vi.fn();
  const onRefresh = vi.fn();
  const onStatusFilterChange = vi.fn();
  const props: React.ComponentProps<typeof DiscoveredJobsList> = {
    jobs: [makeJob()],
    totalJobs: 1,
    loadingMore: false,
    onLoadMore,
    dismissedCount: 0,
    newCount: 1,
    acceptedCount: 0,
    statusFilter: ["new", "accepted"],
    onStatusFilterChange,
    automationId: "automation-1",
    onRefresh,
    ...overrides,
  };
  const result = render(<DiscoveredJobsList {...props} />);
  return { ...result, onLoadMore, onRefresh, onStatusFilterChange };
}

describe("DiscoveredJobsList", () => {
  it("renders jobs and the records-count summary", () => {
    const { container } = renderList({
      jobs: [makeJob(), makeJob({ id: "job-2", JobTitle: { label: "Backend Engineer" } })],
      totalJobs: 5,
    });

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(
      container.textContent?.replace(/\s+/g, " "),
    ).toContain("Showing 1 to 2 of 5 jobs");
  });

  it("does not render the load-more sentinel once every job is loaded", () => {
    renderList({ jobs: [makeJob()], totalJobs: 1 });

    expect(
      screen.queryByTestId("jobs-load-more-sentinel"),
    ).not.toBeInTheDocument();
  });

  it("calls onLoadMore when the sentinel scrolls into view and more jobs remain", async () => {
    const { onLoadMore } = renderList({
      jobs: [makeJob()],
      totalJobs: 5,
      loadingMore: false,
    });

    expect(screen.getByTestId("jobs-load-more-sentinel")).toBeInTheDocument();

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
      jobs: [makeJob()],
      totalJobs: 5,
      loadingMore: true,
    });

    expect(screen.getByTestId("jobs-load-more-spinner")).toBeInTheDocument();

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
      jobs: [makeJob()],
      totalJobs: 5,
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

  it("shows the true empty state (no header/filter) when there are no jobs at all", () => {
    renderList({
      jobs: [],
      totalJobs: 0,
      dismissedCount: 0,
      newCount: 0,
      acceptedCount: 0,
    });

    expect(screen.getByText("No discovered jobs")).toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });

  it("keeps the status filter visible when the current filter matches no jobs but some exist", () => {
    renderList({
      jobs: [],
      totalJobs: 0,
      dismissedCount: 3,
      newCount: 0,
      acceptedCount: 0,
      statusFilter: ["new", "accepted"],
    });

    expect(screen.getByText("No jobs match this filter")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("checks New and Accepted but not Dismissed by default", async () => {
    renderList({ statusFilter: ["new", "accepted"] });

    await userEvent.click(screen.getByRole("button", { name: "Status" }));

    expect(
      screen.getByRole("menuitemcheckbox", { name: "New" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Accepted" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Dismissed" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("adds Dismissed to the filter when checked", async () => {
    const { onStatusFilterChange } = renderList({
      statusFilter: ["new", "accepted"],
    });

    await userEvent.click(screen.getByRole("button", { name: "Status" }));
    await userEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Dismissed" }),
    );

    expect(onStatusFilterChange).toHaveBeenCalledWith([
      "new",
      "accepted",
      "dismissed",
    ]);
  });

  it("removes New from the filter when unchecked", async () => {
    const { onStatusFilterChange } = renderList({
      statusFilter: ["new", "accepted"],
    });

    await userEvent.click(screen.getByRole("button", { name: "Status" }));
    await userEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "New" }),
    );

    expect(onStatusFilterChange).toHaveBeenCalledWith(["accepted"]);
  });
});
