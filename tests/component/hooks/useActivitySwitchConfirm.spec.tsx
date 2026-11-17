import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useActivitySwitchConfirm } from "@/hooks/useActivitySwitchConfirm";
import { useActivity } from "@/context/ActivityContext";

vi.mock("@/context/ActivityContext", () => ({
  useActivity: vi.fn(),
}));

function TestHarness({ action }: { action: () => void }) {
  const { requestStart, confirmDialog } = useActivitySwitchConfirm();
  return (
    <div>
      <button onClick={() => requestStart(action)}>Trigger Start</button>
      {confirmDialog}
    </div>
  );
}

describe("useActivitySwitchConfirm", () => {
  const user = userEvent.setup();
  const mockStopActivity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs the action immediately when there is no activity in progress", async () => {
    (useActivity as any).mockReturnValue({
      currentActivity: undefined,
      stopActivity: mockStopActivity,
    });

    const action = vi.fn();
    render(<TestHarness action={action} />);

    await user.click(screen.getByText("Trigger Start"));

    expect(action).toHaveBeenCalledTimes(1);
    expect(mockStopActivity).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/Stop current activity and start a new one/i)
    ).not.toBeInTheDocument();
  });

  it("shows a confirm dialog naming the in-progress activity instead of running the action", async () => {
    (useActivity as any).mockReturnValue({
      currentActivity: { id: "a1", activityName: "Writing docs" },
      stopActivity: mockStopActivity,
    });

    const action = vi.fn();
    render(<TestHarness action={action} />);

    await user.click(screen.getByText("Trigger Start"));

    expect(action).not.toHaveBeenCalled();
    expect(mockStopActivity).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Stop current activity and start a new one/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/"Writing docs" is currently in progress/i)
    ).toBeInTheDocument();
  });

  it("stops the current activity then runs the pending action on confirm", async () => {
    (useActivity as any).mockReturnValue({
      currentActivity: { id: "a1", activityName: "Writing docs" },
      stopActivity: mockStopActivity,
    });

    const action = vi.fn();
    render(<TestHarness action={action} />);

    await user.click(screen.getByText("Trigger Start"));

    const confirmButton = await screen.findByRole("button", {
      name: "Stop & Start",
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockStopActivity).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/Stop current activity and start a new one/i)
      ).not.toBeInTheDocument();
    });
  });

  // Another session can grab the per-user running activity between this page's
  // last sync and the click, so the server rejects a start that looked valid
  // locally. Resync and offer the switch instead of dead-ending on a toast.
  it("prompts to switch when the start is rejected and another activity is running", async () => {
    const mockRefresh = vi
      .fn()
      .mockResolvedValue({ id: "a2", activityName: "Other session activity" });
    (useActivity as any).mockReturnValue({
      currentActivity: undefined,
      stopActivity: mockStopActivity,
      refreshCurrentActivity: mockRefresh,
    });

    const action = vi.fn().mockResolvedValue(false);
    render(<TestHarness action={action} />);

    await user.click(screen.getByText("Trigger Start"));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(/Stop current activity and start a new one/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop & Start" }));

    await waitFor(() => {
      expect(mockStopActivity).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenCalledTimes(2);
    });
  });

  it("does not prompt when the start is rejected and nothing is running", async () => {
    const mockRefresh = vi.fn().mockResolvedValue(undefined);
    (useActivity as any).mockReturnValue({
      currentActivity: undefined,
      stopActivity: mockStopActivity,
      refreshCurrentActivity: mockRefresh,
    });

    const action = vi.fn().mockResolvedValue(false);
    render(<TestHarness action={action} />);

    await user.click(screen.getByText("Trigger Start"));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText(/Stop current activity and start a new one/i)
    ).not.toBeInTheDocument();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("does not resync when the start succeeds", async () => {
    const mockRefresh = vi.fn();
    (useActivity as any).mockReturnValue({
      currentActivity: undefined,
      stopActivity: mockStopActivity,
      refreshCurrentActivity: mockRefresh,
    });

    const action = vi.fn().mockResolvedValue(true);
    render(<TestHarness action={action} />);

    await user.click(screen.getByText("Trigger Start"));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does not run the action when the dialog is dismissed", async () => {
    (useActivity as any).mockReturnValue({
      currentActivity: { id: "a1", activityName: "Writing docs" },
      stopActivity: mockStopActivity,
    });

    const action = vi.fn();
    render(<TestHarness action={action} />);

    await user.click(screen.getByText("Trigger Start"));

    const cancelButton = await screen.findByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByText(/Stop current activity and start a new one/i)
      ).not.toBeInTheDocument();
    });

    expect(action).not.toHaveBeenCalled();
    expect(mockStopActivity).not.toHaveBeenCalled();
  });
});
