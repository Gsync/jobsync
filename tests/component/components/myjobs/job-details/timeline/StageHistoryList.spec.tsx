import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StageHistoryList } from "@/components/myjobs/job-details/timeline/StageHistoryList";

const stage = (id: string, label: string, over: any = {}) => ({
  id,
  jobId: "j1",
  stageTypeId: `t-${id}`,
  occurredAt: null,
  isCurrent: false,
  outcome: null,
  notes: null,
  durationMins: null,
  format: null,
  location: null,
  createdAt: new Date(2026, 8, 1),
  updatedAt: new Date(2026, 8, 1),
  StageType: { id: `t-${id}`, label, value: label.toLowerCase(), statusId: "s", sortOrder: 0, Status: { id: "s", label, value: "interview" } },
  interviewers: [],
  prepQuestions: [],
  ...over,
});

const stages = [
  stage("a", "New", { occurredAt: new Date(2026, 8, 1) }),
  stage("b", "Applied", { occurredAt: new Date(2026, 8, 3) }),
  stage("c", "Final / Onsite Interview", { occurredAt: new Date(2026, 8, 24), isCurrent: true }),
] as any;

const terminalTypes = [
  { id: "t-off", label: "Offer", value: "offer", statusId: "s-off", sortOrder: 7, Status: { value: "offer" } },
] as any;

const renderList = (props: any = {}) =>
  render(
    <StageHistoryList
      stages={stages}
      selectedStageId="c"
      currentStageId="c"
      terminalTypes={terminalTypes}
      onSelect={() => {}}
      onAddStage={() => {}}
      {...props}
    />,
  );

describe("StageHistoryList", () => {
  it("renders every stage with its date, then the unreached terminal step", () => {
    renderList();

    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Sep 1")).toBeInTheDocument();
    expect(screen.getByText("Final / Onsite Interview")).toBeInTheDocument();
    expect(screen.getByText("Offer")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("marks the current stage for assistive tech", () => {
    renderList();

    expect(
      screen.getByRole("button", { name: /Final \/ Onsite Interview/ }),
    ).toHaveAttribute("aria-current", "step");
  });

  it("selects a stage on click", async () => {
    const onSelect = vi.fn();
    renderList({ onSelect });

    await userEvent.click(screen.getByRole("button", { name: /Applied/ }));

    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("renders the unreached terminal step as a non-interactive element", () => {
    renderList();

    expect(screen.queryByRole("button", { name: /Offer/ })).toBeNull();
  });

  it("shows an em dash for an undated stage", () => {
    renderList({
      stages: [stage("a", "New")] as any,
      selectedStageId: "a",
      currentStageId: "a",
      terminalTypes: [] as any,
    });

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
