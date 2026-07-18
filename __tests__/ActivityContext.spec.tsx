import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ActivityProvider,
  useActivity,
} from "@/context/ActivityContext";
import {
  deleteActivityById,
  getCurrentActivity,
  startActivityById,
  stopActivityById,
} from "@/actions/activity.actions";
import { toast } from "@/components/ui/use-toast";
import { APP_CONSTANTS } from "@/lib/constants";

vi.mock("@/actions/activity.actions", () => ({
  getCurrentActivity: vi.fn(),
  startActivityById: vi.fn(),
  stopActivityById: vi.fn(),
  deleteActivityById: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

function TestHarness() {
  const { currentActivity, startActivity, stopActivity } = useActivity();
  return (
    <div>
      <div data-testid="current">{currentActivity ? currentActivity.id : "none"}</div>
      <button onClick={() => startActivity("activity-type-1")}>Start</button>
      <button onClick={() => stopActivity()}>Stop</button>
    </div>
  );
}

describe("ActivityContext stopActivity duration guard", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    (getCurrentActivity as any).mockResolvedValue({ success: false });
  });

  const startWith = async (startTime: Date, id: string) => {
    (startActivityById as any).mockResolvedValue({
      success: true,
      newActivity: {
        id,
        activityName: "Test Activity",
        startTime,
        activityType: { id: "t1", label: "Coding" },
      },
    });

    render(
      <ActivityProvider>
        <TestHarness />
      </ActivityProvider>
    );

    await user.click(screen.getByText("Start"));
    await waitFor(() =>
      expect(screen.getByTestId("current")).toHaveTextContent(id)
    );
  };

  it("discards the activity instead of saving it when stopped under the minimum duration", async () => {
    (deleteActivityById as any).mockResolvedValue({ success: true });

    await startWith(new Date(), "act-short");
    await user.click(screen.getByText("Stop"));

    await waitFor(() => {
      expect(deleteActivityById).toHaveBeenCalledWith("act-short");
    });
    expect(stopActivityById).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: expect.stringContaining(
          `less than ${APP_CONSTANTS.ACTIVITY_MIN_DURATION_MINUTES} minutes`
        ),
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId("current")).toHaveTextContent("none")
    );
  });

  it("saves the activity normally when duration meets the minimum", async () => {
    (stopActivityById as any).mockResolvedValue({ success: true });

    const startTime = new Date(
      Date.now() - (APP_CONSTANTS.ACTIVITY_MIN_DURATION_MINUTES + 3) * 60 * 1000
    );
    await startWith(startTime, "act-long");
    await user.click(screen.getByText("Stop"));

    await waitFor(() => {
      expect(stopActivityById).toHaveBeenCalledWith(
        "act-long",
        expect.any(Date),
        expect.any(Number)
      );
    });
    expect(deleteActivityById).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "success" })
    );
    await waitFor(() =>
      expect(screen.getByTestId("current")).toHaveTextContent("none")
    );
  });

  it("shows an error toast and keeps the activity when discarding fails", async () => {
    (deleteActivityById as any).mockResolvedValue({
      success: false,
      message: "Failed to delete activity.",
    });

    await startWith(new Date(), "act-fail");
    await user.click(screen.getByText("Stop"));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Error!",
          description: "Failed to delete activity.",
        })
      );
    });
    expect(stopActivityById).not.toHaveBeenCalled();
    expect(screen.getByTestId("current")).toHaveTextContent("act-fail");
  });
});
