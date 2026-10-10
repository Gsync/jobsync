import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SetGoalsDialog from "@/components/dashboard/SetGoalsDialog";
import { updateGoalTargets } from "@/actions/dailyGoals.actions";
import { toastError, toastSuccess } from "@/lib/toast";

vi.mock("@/actions/dailyGoals.actions", () => ({
  updateGoalTargets: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastActionResult: vi.fn((result, opts) => {
    if (result?.success) opts.onSuccess?.(result.data);
    else (toastError as any)(result?.message);
  }),
}));

describe("SetGoalsDialog", () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();

  const renderDialog = () =>
    render(
      <SetGoalsDialog
        open
        onOpenChange={onOpenChange}
        month="2026-10"
        targets={{ jobs: 5, hours: 4 }}
        onSaved={onSaved}
      />,
    );
  const jobs = () => screen.getByLabelText("Jobs applied per day");
  const hours = () => screen.getByLabelText("Activity hours per day");
  const save = () => screen.getByRole("button", { name: "Save goals" });

  it("pre-fills the current targets and names the month", () => {
    renderDialog();
    expect(jobs()).toHaveValue(5);
    expect(hours()).toHaveValue(4);
    expect(
      screen.getByText(/Applies from October 2026 and carries forward/),
    ).toBeInTheDocument();
    // The pill; the description holds the month inside a longer sentence
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(screen.getByText("1 to 50")).toBeInTheDocument();
    expect(screen.getByText("1 to 24")).toBeInTheDocument();
  });

  it("disables Save until something changes", async () => {
    renderDialog();
    expect(save()).toBeDisabled();
    await user.clear(jobs());
    await user.type(jobs(), "3");
    expect(save()).toBeEnabled();
  });

  it("steps a value and shows what it was", async () => {
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Fewer jobs" }));
    await user.click(screen.getByRole("button", { name: "Fewer jobs" }));
    expect(jobs()).toHaveValue(3);
    expect(screen.getByText("Was 5 · now 3")).toBeInTheDocument();
    expect(screen.queryByText("1 to 50")).not.toBeInTheDocument();
    expect(save()).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "More jobs" }));
    await user.click(screen.getByRole("button", { name: "More jobs" }));
    // Back to the pre-fill: the range returns
    expect(screen.getByText("1 to 50")).toBeInTheDocument();
  });

  it("clamps the stepper at the limits", async () => {
    render(
      <SetGoalsDialog
        open
        onOpenChange={onOpenChange}
        month="2026-10"
        targets={{ jobs: 1, hours: 24 }}
        onSaved={onSaved}
      />,
    );
    expect(screen.getByRole("button", { name: "Fewer jobs" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "More hours" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "More jobs" })).toBeEnabled();
  });

  it("steps a cleared field from the minimum", async () => {
    renderDialog();
    await user.clear(hours());
    await user.click(screen.getByRole("button", { name: "More hours" }));
    expect(hours()).toHaveValue(1);
  });

  it("shows the error as soon as a field is invalid", async () => {
    renderDialog();
    await user.clear(jobs());
    expect(await screen.findByText("Enter a number.")).toBeInTheDocument();
    expect(screen.queryByText(/now NaN/)).not.toBeInTheDocument();
    await user.type(jobs(), "51");
    expect(await screen.findByText("Must be at most 50.")).toBeInTheDocument();
    expect(screen.queryByText(/now 51/)).not.toBeInTheDocument();
  });

  it("saves the current month and hands back the result", async () => {
    const data = {
      targets: { "2026-10": { jobs: 3, hours: 4 } },
      streaks: { current: 1, best: 4 },
    };
    (updateGoalTargets as any).mockResolvedValue({ success: true, data });
    renderDialog();

    await user.clear(jobs());
    await user.type(jobs(), "3");
    await user.click(save());

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(data));
    expect(updateGoalTargets).toHaveBeenCalledWith({
      month: "2026-10",
      jobs: 3,
      hours: 4,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it.each([
    ["", "Enter a number."],
    ["0", "Must be at least 1."],
    ["51", "Must be at most 50."],
    ["2.5", "Use a whole number."],
  ])("blocks invalid input without saving (%s)", async (input, message) => {
    renderDialog();
    await user.clear(jobs());
    if (input) await user.type(jobs(), input);
    await user.click(save());
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(updateGoalTargets).not.toHaveBeenCalled();
  });

  it("stays open with the input kept when the save fails", async () => {
    (updateGoalTargets as any).mockResolvedValue({
      success: false,
      message: "The month has changed — reload the page.",
    });
    renderDialog();
    await user.clear(hours());
    await user.type(hours(), "6");
    await user.click(save());

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "The month has changed — reload the page.",
      ),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(hours()).toHaveValue(6);
  });
});
