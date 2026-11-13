import { act, render, screen } from "@testing-library/react";

const replace = vi.fn();
const router = { replace };
let search = "";
// Stable per URL, like Next's hook, so a re-render alone changes nothing.
let cachedSearch = "";
let cachedParams = new URLSearchParams();
const AUTOMATION = {
  id: "a1",
  name: "Auto",
  jobBoard: "greenhouse",
  resume: {},
};
let automation: typeof AUTOMATION | undefined = AUTOMATION;

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/automations/a1",
  useSearchParams: () => {
    if (search !== cachedSearch) {
      cachedSearch = search;
      cachedParams = new URLSearchParams(search);
    }
    return cachedParams;
  },
}));

vi.mock(
  "@/components/automations/automation-detail-container/useAutomationDetailData",
  () => ({
    useAutomationDetailData: () => ({
      automation,
      runs: [],
      totalRuns: 0,
      runsLoadingMore: false,
      jobs: [],
      totalJobs: 0,
      jobsLoadingMore: false,
      jobStatusCounts: { new: 0, dismissed: 0, accepted: 0 },
      statusFilter: "all",
      loading: false,
      loadData: vi.fn(),
      refreshJobs: vi.fn(),
      loadMoreJobs: vi.fn(),
      loadMoreRuns: vi.fn(),
      handleStatusFilterChange: vi.fn(),
    }),
  }),
);
vi.mock(
  "@/components/automations/automation-detail-container/useAutomationLifecycle",
  () => ({ useAutomationLifecycle: () => ({ setDeleteConfirmOpen: vi.fn() }) }),
);
vi.mock(
  "@/components/automations/automation-detail-container/useAutomationRun",
  () => ({
    useAutomationRun: () => ({
      logData: { isRunning: false },
      runNowLoading: false,
      setAbortConfirmOpen: vi.fn(),
    }),
  }),
);
vi.mock(
  "@/components/automations/automation-detail-container/useAutomationWizardData",
  () => ({ useAutomationWizardData: () => ({ resumes: [], allAutomations: [] }) }),
);
vi.mock(
  "@/components/automations/automation-detail-container/useDiscoveredJobDetail",
  () => ({ useDiscoveredJobDetail: () => ({ setDetailOpen: vi.fn() }) }),
);
vi.mock(
  "@/components/automations/automation-detail-container/AutomationDetailHeader",
  () => ({ AutomationDetailHeader: () => null }),
);
vi.mock(
  "@/components/automations/automation-detail-container/AutomationSummaryCard",
  () => ({ AutomationSummaryCard: () => null }),
);
vi.mock(
  "@/components/automations/automation-detail-container/AutomationDetailDialogs",
  () => ({ AutomationDetailDialogs: () => null }),
);
vi.mock("@/components/automations/DiscoveredJobsList", () => ({
  DiscoveredJobsList: () => null,
}));
vi.mock("@/components/automations/DiscoveredJobDetail", () => ({
  DiscoveredJobDetail: () => null,
}));
vi.mock("@/components/automations/RunHistoryList", () => ({
  RunHistoryList: () => null,
}));
vi.mock("@/components/automations/LogsTab", () => ({ LogsTab: () => null }));
vi.mock("@/components/automations/AutomationWizard", () => ({
  AutomationWizard: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="wizard">
      {open ? "open" : "closed"}
      <button onClick={() => onOpenChange(false)}>close wizard</button>
    </div>
  ),
}));

import { AutomationDetailContainer } from "@/components/automations/AutomationDetailContainer";

describe("AutomationDetailContainer ?edit=1", () => {
  beforeEach(() => {
    automation = AUTOMATION;
  });

  it("opens the wizard and strips the param", () => {
    search = "edit=1&tab=jobs";
    render(<AutomationDetailContainer automationId="a1" />);
    expect(screen.getByTestId("wizard")).toHaveTextContent("open");
    expect(replace).toHaveBeenCalledWith(
      "/dashboard/automations/a1?tab=jobs",
    );
  });

  it("leaves the wizard closed without the param", () => {
    search = "";
    render(<AutomationDetailContainer automationId="a1" />);
    expect(screen.getByTestId("wizard")).toHaveTextContent("closed");
    expect(replace).not.toHaveBeenCalled();
  });

  it("waits for the automation before opening", () => {
    search = "edit=1";
    automation = undefined;
    const { rerender } = render(
      <AutomationDetailContainer automationId="a1" />,
    );
    expect(screen.queryByTestId("wizard")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    automation = AUTOMATION;
    rerender(<AutomationDetailContainer automationId="a1" />);
    expect(screen.getByTestId("wizard")).toHaveTextContent("open");
    expect(replace).toHaveBeenCalledWith("/dashboard/automations/a1");
  });

  it("does not reopen on a re-render with the same URL", () => {
    search = "edit=1";
    const { rerender } = render(
      <AutomationDetailContainer automationId="a1" />,
    );
    act(() => screen.getByText("close wizard").click());
    rerender(<AutomationDetailContainer automationId="a1" />);
    expect(screen.getByTestId("wizard")).toHaveTextContent("closed");
  });

  it("reopens for a fresh ?edit=1 while already on the page", () => {
    search = "edit=1";
    const { rerender } = render(
      <AutomationDetailContainer automationId="a1" />,
    );
    act(() => screen.getByText("close wizard").click());
    search = "";
    rerender(<AutomationDetailContainer automationId="a1" />);
    expect(screen.getByTestId("wizard")).toHaveTextContent("closed");

    search = "edit=1";
    rerender(<AutomationDetailContainer automationId="a1" />);
    expect(screen.getByTestId("wizard")).toHaveTextContent("open");
  });
});
