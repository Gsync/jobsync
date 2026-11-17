import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersistedTabIndex } from "@/hooks/usePersistedTabIndex";
import { AddJobFooter } from "@/components/myjobs/add-job/AddJobFooter";
import { TasksToolbar } from "@/components/tasks/tasks-container/TasksToolbar";
import { useJobsList } from "@/components/myjobs/jobs-container/useJobsList";
import { APP_CONSTANTS } from "@/lib/constants";
import { EMPTY_JOB_FACETS } from "@/lib/jobs/jobFacets";

vi.mock("@/actions/job.actions", () => ({
  getJobsList: vi.fn(() => new Promise(() => {})),
}));
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => ({ jobWrites: 0 }),
}));

function Probe() {
  return <span>{String(useHydrated())}</span>;
}

function TabProbe() {
  const [index] = usePersistedTabIndex("tab-key", ["A", "B"]);
  return <span>tab {index}</span>;
}

function ViewModeProbe() {
  const { viewMode } = useJobsList({
    companyFilter: null,
    appliedFilter: false,
    titleFilter: null,
    locationFilter: null,
    sourceFilter: null,
    facets: EMPTY_JOB_FACETS,
    sort: null,
  });
  return <span>mode {viewMode}</span>;
}

const noop = () => {};

describe("useHydrated", () => {
  beforeEach(() => localStorage.clear());

  it("is false in the server render", () => {
    expect(renderToString(<Probe />)).toContain("false");
  });

  it("is true once mounted on the client", () => {
    render(<Probe />);
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  describe("server render emits the default, never the client value", () => {
    it("AddJobFooter shows Ctrl↵ on a Mac user agent", () => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Macintosh");
      const html = renderToString(
        <AddJobFooter
          missing={[]}
          onJump={noop}
          onCancel={noop}
          isPending={false}
          saveDisabled={false}
        />,
      );
      expect(html).toContain("Ctrl↵");
      expect(html).not.toContain("⌘↵");
    });

    it("usePersistedTabIndex starts on tab 0 with a saved tab", () => {
      localStorage.setItem("tab-key", JSON.stringify("B"));
      expect(renderToString(<TabProbe />)).toContain("tab <!-- -->0");
    });

    it("useJobsList starts in table mode with cards saved", () => {
      localStorage.setItem(
        APP_CONSTANTS.JOBS_VIEW_MODE_STORAGE_KEY,
        JSON.stringify("cards"),
      );
      expect(renderToString(<ViewModeProbe />)).toContain(
        "mode <!-- -->table",
      );
    });

    it("TasksToolbar renders the plain filter placeholder", () => {
      const html = renderToString(
        <TasksToolbar
          tasksCount={0}
          totalTasks={0}
          initialLoading={false}
          searchTerm=""
          onSearchTermChange={noop}
          statusFilter={[]}
          onToggleStatusFilter={noop}
          groupBy={"none" as never}
          onGroupByChange={noop}
          onAddTask={noop}
        />,
      );
      expect(html).toContain('aria-label="Filter tasks"');
      expect(html).not.toContain("aria-haspopup");
    });
  });

  describe("client render picks up the stored value", () => {
    it("usePersistedTabIndex restores the saved tab", () => {
      localStorage.setItem("tab-key", JSON.stringify("B"));
      render(<TabProbe />);
      expect(screen.getByText("tab 1")).toBeInTheDocument();
    });

    it("useJobsList restores the saved view mode", () => {
      localStorage.setItem(
        APP_CONSTANTS.JOBS_VIEW_MODE_STORAGE_KEY,
        JSON.stringify("cards"),
      );
      render(<ViewModeProbe />);
      expect(screen.getByText("mode cards")).toBeInTheDocument();
    });
  });
});
