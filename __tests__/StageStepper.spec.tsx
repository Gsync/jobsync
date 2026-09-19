import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StageStepper } from "@/components/myjobs/job-details/timeline/StageStepper";

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

describe("StageStepper", () => {
  it("renders every stage with its date, then the unreached terminal step", () => {
    render(
      <StageStepper
        stages={stages}
        selectedStageId="c"
        currentStageId="c"
        terminalTypes={terminalTypes}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Sep 1")).toBeInTheDocument();
    expect(screen.getByText("Final / Onsite Interview")).toBeInTheDocument();
    expect(screen.getByText("Offer")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("marks the current stage for assistive tech", () => {
    render(
      <StageStepper
        stages={stages}
        selectedStageId="c"
        currentStageId="c"
        terminalTypes={terminalTypes}
        onSelect={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Final \/ Onsite Interview/ }),
    ).toHaveAttribute("aria-current", "step");
  });

  it("selects a step on click", async () => {
    const onSelect = vi.fn();
    render(
      <StageStepper
        stages={stages}
        selectedStageId="c"
        currentStageId="c"
        terminalTypes={terminalTypes}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Applied/ }));

    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("renders the unreached terminal step as a non-interactive element", () => {
    render(
      <StageStepper
        stages={stages}
        selectedStageId="c"
        currentStageId="c"
        terminalTypes={terminalTypes}
        onSelect={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: /Offer/ })).toBeNull();
  });

  // The rail truncates to one line; the full name stays reachable on hover
  // and in the history list. Without this a long label wraps and pushes its
  // dot out of line with the connectors either side.
  it("keeps a long label on one line with the full name in a title", () => {
    render(
      <StageStepper
        stages={stages}
        selectedStageId="c"
        currentStageId="c"
        terminalTypes={terminalTypes}
        onSelect={() => {}}
      />,
    );

    const label = screen.getByText("Final / Onsite Interview");
    expect(label).toHaveAttribute("title", "Final / Onsite Interview");
    expect(label.className).toContain("truncate");
  });
});
