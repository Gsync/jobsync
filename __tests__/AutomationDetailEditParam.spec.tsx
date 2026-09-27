import { render, screen } from "@testing-library/react";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard/automations/a1",
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock(
  "@/components/automations/automation-detail-container/useAutomationDetailData",
  () => ({
    useAutomationDetailData: () => ({
      automation: { id: "a1", name: "Auto", jobBoard: "greenhouse", resume: {} },
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
  AutomationWizard: ({ open }: { open: boolean }) => (
    <div data-testid="wizard">{open ? "open" : "closed"}</div>
  ),
}));

import { AutomationDetailContainer } from "@/components/automations/AutomationDetailContainer";

describe("AutomationDetailContainer ?edit=1", () => {
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
});
