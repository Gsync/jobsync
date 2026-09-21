import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddStageDialog } from "@/components/AddStageDialog";
import { addJobStage } from "@/actions/jobStage.actions";

vi.mock("@/actions/jobStage.actions", () => ({
  addJobStage: vi.fn().mockResolvedValue({ success: true, data: { id: "st1" } }),
  updateJobStage: vi.fn().mockResolvedValue({ success: true, data: { id: "st1" } }),
}));
vi.mock("@/lib/toast", () => ({
  toastActionResult: vi.fn((res, opts) => res.success && opts.onSuccess?.()),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

// jsdom lacks scrollIntoView, which cmdk calls when selecting an item
Element.prototype.scrollIntoView = vi.fn();

const stageTypes = [
  { id: "t-off", label: "Offer", value: "offer", statusId: "s-off", sortOrder: 7, Status: { id: "s-off", label: "Offer", value: "offer" } },
  { id: "t-int", label: "Final / Onsite Interview", value: "final / onsite interview", statusId: "s-int", sortOrder: 6, Status: { id: "s-int", label: "Interview", value: "interview" } },
] as any;

const jobStatuses = [
  { id: "s-off", label: "Offer", value: "offer" },
  { id: "s-int", label: "Interview", value: "interview" },
] as any;

const props = {
  open: true,
  jobId: "j1",
  jobLabel: "Senior Frontend Engineer · Acme Corp",
  stage: null,
  stageTypes,
  jobStatuses,
  onOpenChange: () => {},
  onSaved: vi.fn(),
};

// The shared Combobox takes no data-testid, so the picker is wrapped in one
// and the trigger reached through it (Playwright's centre click lands on the
// button; a jsdom click on the wrapper would not).
const openStageTypePicker = async () =>
  userEvent.click(
    within(screen.getByTestId("stage-type-select")).getByRole("combobox"),
  );

describe("AddStageDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("heads the dialog with the job it belongs to", () => {
    render(<AddStageDialog {...props} />);
    expect(screen.getByText("Senior Frontend Engineer · Acme Corp")).toBeInTheDocument();
  });

  it("ticks Set as current stage by default", () => {
    render(<AddStageDialog {...props} />);
    expect(screen.getByRole("checkbox", { name: /Set as current stage/ })).toBeChecked();
  });

  // Nothing demotes a stage, so a live checkbox here would silently do nothing.
  it("locks the checkbox when editing the stage that is already current", () => {
    render(
      <AddStageDialog
        {...props}
        stage={{ id: "st1", isCurrent: true, stageTypeId: "t-int", occurredAt: null, notes: null, outcome: null, durationMins: null, format: null, location: null, StageType: stageTypes[1] } as any}
      />,
    );

    const box = screen.getByRole("checkbox", { name: /Set as current stage/ });
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
    expect(screen.getByText(/tick the box on another stage to move it/)).toBeInTheDocument();
  });

  it("hides the parent-status picker until a custom name is typed", async () => {
    render(<AddStageDialog {...props} />);
    expect(screen.queryByText(/PARENT STATUS/i)).toBeNull();

    await userEvent.type(
      screen.getByPlaceholderText("e.g. Panel Interview, Reference Check…"),
      "Panel Interview",
    );

    expect(screen.getByText(/PARENT STATUS/i)).toBeInTheDocument();
  });

  // Adding a stage records something that just happened, so the date and time
  // open on now rather than empty.
  it("saves with the picked type, today's date and time, and set-as-current", async () => {
    render(<AddStageDialog {...props} />);

    await openStageTypePicker();
    await userEvent.click(screen.getByRole("option", { name: "Offer" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Stage" }));

    expect(addJobStage).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "j1",
        stageTypeId: "t-off",
        setAsCurrent: true,
        date: expect.any(Date),
        time: expect.stringMatching(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/),
      }),
    );
  });

  it("refuses to save with neither a type nor a custom name", async () => {
    render(<AddStageDialog {...props} />);

    await userEvent.click(screen.getByRole("button", { name: "Add Stage" }));

    expect(addJobStage).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Pick a stage or enter a custom stage name/),
    ).toBeInTheDocument();
  });
});
