import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BreakModal } from "@/components/activities/BreakModal";
import { ActivityBanner } from "@/components/activities/ActivityBanner";
import { useActivity } from "@/context/ActivityContext";
import { toastSuccess } from "@/lib/toast";

vi.mock("@/context/ActivityContext", () => ({
  useActivity: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const contextValue = (overrides: Record<string, unknown> = {}) => ({
  currentActivity: {
    id: "act-1",
    activityName: "Coding",
    startTime: new Date(Date.now() - 60 * 60 * 1000),
    activityType: { id: "t1", label: "Coding" },
    breakMinutes: 0,
    breakStartedAt: new Date(Date.now() - 5 * 60 * 1000),
    breakPlannedMins: 15,
  },
  isOnBreak: true,
  startBreak: vi.fn(),
  endBreak: vi.fn(),
  setBreakLength: vi.fn(),
  stopActivity: vi.fn(),
  ...overrides,
});

// The break has not started yet: the modal is open, but nothing is running.
const notStartedValue = (overrides: Record<string, unknown> = {}) =>
  contextValue({
    isOnBreak: false,
    currentActivity: {
      ...contextValue().currentActivity,
      breakStartedAt: null,
      breakPlannedMins: null,
    },
    ...overrides,
  });

const renderModal = (props: Record<string, unknown> = {}) =>
  render(<BreakModal open onClose={vi.fn()} {...props} />);

describe("BreakModal", () => {
  const user = userEvent.setup();

  it("renders nothing when it is not open", () => {
    (useActivity as any).mockReturnValue(
      contextValue({ isOnBreak: false, currentActivity: undefined }),
    );

    const { container } = renderModal({ open: false });

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("counts down the remaining break time", () => {
    (useActivity as any).mockReturnValue(contextValue());

    renderModal();

    // Started 5 minutes into a 15-minute break.
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("Break")).toBeInTheDocument();
  });

  it("counts overtime once the planned break is used up", () => {
    (useActivity as any).mockReturnValue(
      contextValue({
        currentActivity: {
          ...contextValue().currentActivity,
          breakStartedAt: new Date(Date.now() - 20 * 60 * 1000),
          breakPlannedMins: 15,
        },
      }),
    );

    renderModal();

    expect(screen.getByText("+05:00")).toBeInTheDocument();
    expect(screen.getByText("Break over")).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("waits on the play button instead of starting the break on open", () => {
    const value = notStartedValue();
    (useActivity as any).mockReturnValue(value);

    renderModal();

    expect(value.startBreak).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Start break" }),
    ).toHaveTextContent("Start");
    // Full planned length, not counting down.
    expect(screen.getByText("15:00")).toBeInTheDocument();
  });

  it("starts the break from the play button", async () => {
    const value = notStartedValue();
    (useActivity as any).mockReturnValue(value);

    renderModal();
    await user.click(screen.getByRole("button", { name: "Start break" }));

    expect(value.startBreak).toHaveBeenCalledWith(15);
  });

  it("keeps the length change local until the break starts", async () => {
    const value = notStartedValue();
    (useActivity as any).mockReturnValue(value);

    renderModal();
    await user.click(screen.getByRole("button", { name: "30 min" }));

    expect(value.setBreakLength).not.toHaveBeenCalled();
    expect(screen.getByText("30:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start break" }));

    expect(value.startBreak).toHaveBeenCalledWith(30);
  });

  it("closes from the X while the break has not started", async () => {
    const value = notStartedValue();
    const onClose = vi.fn();
    (useActivity as any).mockReturnValue(value);

    renderModal({ onClose });
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
    expect(value.startBreak).not.toHaveBeenCalled();
  });

  it("hides the X once the break is running", () => {
    (useActivity as any).mockReturnValue(contextValue());

    renderModal();

    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("resumes the activity from the pause button and closes", async () => {
    const value = contextValue();
    const onClose = vi.fn();
    (useActivity as any).mockReturnValue(value);

    renderModal({ onClose });
    const pause = screen.getByRole("button", { name: "Resume activity" });
    expect(pause).toHaveTextContent("Resume");
    await user.click(pause);

    expect(value.endBreak).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("ends a running break from the Resume Activity button", async () => {
    const value = contextValue();
    const onClose = vi.fn();
    (useActivity as any).mockReturnValue(value);

    renderModal({ onClose });
    await user.click(screen.getByRole("button", { name: "Resume Activity" }));

    expect(value.endBreak).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("starts the break from the Start Break button", async () => {
    const value = notStartedValue();
    const onClose = vi.fn();
    (useActivity as any).mockReturnValue(value);

    renderModal({ onClose });
    expect(
      screen.queryByRole("button", { name: "Resume Activity" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start Break" }));

    expect(value.startBreak).toHaveBeenCalledWith(15);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops the activity only after the confirmation is accepted", async () => {
    const value = contextValue();
    const onClose = vi.fn();
    (useActivity as any).mockReturnValue(value);

    renderModal({ onClose });
    await user.click(screen.getByRole("button", { name: "Stop Activity" }));

    const confirm = await screen.findByRole("alertdialog");
    expect(value.stopActivity).not.toHaveBeenCalled();

    await user.click(
      within(confirm).getByRole("button", { name: "Stop Activity" }),
    );

    expect(value.stopActivity).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the activity running when the confirmation is cancelled", async () => {
    const value = contextValue();
    const onClose = vi.fn();
    (useActivity as any).mockReturnValue(value);

    renderModal({ onClose });
    await user.click(screen.getByRole("button", { name: "Stop Activity" }));

    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));

    expect(value.stopActivity).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("changes the break length from a preset", async () => {
    const value = contextValue();
    (useActivity as any).mockReturnValue(value);

    renderModal();
    await user.click(screen.getByRole("button", { name: "30 min" }));

    expect(value.setBreakLength).toHaveBeenCalledWith(30);
  });

  it("extends the break with the stepper", async () => {
    const value = contextValue();
    (useActivity as any).mockReturnValue(value);

    renderModal();
    await user.click(
      screen.getByRole("button", { name: "Increase break length" }),
    );

    expect(value.setBreakLength).toHaveBeenCalledWith(20);
  });

  // These two do not exercise the preventDefault handlers — Root is `open`
  // with no onOpenChange, so nothing can close it either way. What they guard
  // is the refactor that actually breaks decision 8: someone wiring up
  // onOpenChange and making the dialog controlled.
  it("cannot be dismissed with the Escape key", async () => {
    (useActivity as any).mockReturnValue(contextValue());

    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("cannot be dismissed by clicking outside it", async () => {
    (useActivity as any).mockReturnValue(contextValue());

    renderModal();
    // Radix genuinely sets pointer-events: none on body while a modal Dialog
    // is open (the real lock, working as intended), so userEvent.click
    // refuses to target it — fireEvent bypasses that sanity check.
    fireEvent.click(document.body);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("ActivityBanner break button", () => {
  const user = userEvent.setup();

  it("starts a break when the Break button is used", async () => {
    const onStartBreak = vi.fn();

    render(
      <ActivityBanner
        title="Coding"
        typeLabel="Focus"
        elapsedTime={60_000}
        onStopActivity={vi.fn()}
        onStartBreak={onStartBreak}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Take a break" }));

    expect(onStartBreak).toHaveBeenCalled();
  });

  it("hides the Break button when no handler is supplied", () => {
    render(
      <ActivityBanner
        title="Coding"
        typeLabel="Focus"
        elapsedTime={60_000}
        onStopActivity={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Take a break" }),
    ).not.toBeInTheDocument();
  });
});
