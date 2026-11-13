import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityProvider, useActivity } from "@/context/ActivityContext";
import {
  endBreak,
  getCurrentActivity,
  startActivityById,
  startBreak,
  stopActivityById,
  updateBreakLength,
} from "@/actions/activity.actions";
import { toastSuccess, toastError } from "@/lib/toast";
import { APP_CONSTANTS } from "@/lib/constants";

vi.mock("@/actions/activity.actions", () => ({
  getCurrentActivity: vi.fn(),
  startActivityById: vi.fn(),
  stopActivityById: vi.fn(),
  deleteActivityById: vi.fn(),
  startBreak: vi.fn(),
  endBreak: vi.fn(),
  updateBreakLength: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

function TestHarness() {
  const {
    currentActivity,
    timeElapsed,
    isOnBreak,
    startActivity,
    stopActivity,
    startBreak: begin,
    endBreak: resume,
  } = useActivity();

  return (
    <div>
      <div data-testid="current">
        {currentActivity ? currentActivity.id : "none"}
      </div>
      <div data-testid="on-break">{isOnBreak ? "yes" : "no"}</div>
      <div data-testid="elapsed">{Math.round(timeElapsed / 60000)}</div>
      <button onClick={() => startActivity("activity-type-1")}>Start</button>
      <button onClick={() => stopActivity()}>Stop</button>
      <button onClick={() => begin(15)}>Break</button>
      <button onClick={() => resume()}>Resume</button>
    </div>
  );
}

const activityFixture = (overrides: Record<string, unknown> = {}) => ({
  id: "act-1",
  activityName: "Test Activity",
  startTime: new Date(),
  activityType: { id: "t1", label: "Coding" },
  breakMinutes: 0,
  breakStartedAt: null,
  breakPlannedMins: null,
  ...overrides,
});

describe("ActivityContext", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    (getCurrentActivity as any).mockResolvedValue({ success: false });
  });

  const startWith = async (activity: Record<string, unknown>) => {
    (startActivityById as any).mockResolvedValue({
      success: true,
      newActivity: activity,
    });

    render(
      <ActivityProvider>
        <TestHarness />
      </ActivityProvider>,
    );

    await user.click(screen.getByText("Start"));
    await waitFor(() =>
      expect(screen.getByTestId("current")).toHaveTextContent(
        activity.id as string,
      ),
    );
  };

  describe("stopActivity", () => {
    it("sends only the id and end time, letting the server do the math", async () => {
      (stopActivityById as any).mockResolvedValue({
        success: true,
        discarded: false,
      });

      await startWith(activityFixture());
      await user.click(screen.getByText("Stop"));

      await waitFor(() => {
        expect(stopActivityById).toHaveBeenCalledWith(
          "act-1",
          expect.any(Date),
        );
      });
      expect((stopActivityById as any).mock.calls[0]).toHaveLength(2);
      expect(toastSuccess).toHaveBeenCalledWith("Activity stopped successfully");
      await waitFor(() =>
        expect(screen.getByTestId("current")).toHaveTextContent("none"),
      );
    });

    it("warns and clears when the server discards the activity as too short", async () => {
      (stopActivityById as any).mockResolvedValue({
        success: true,
        discarded: true,
      });

      await startWith(activityFixture({ id: "act-short" }));
      await user.click(screen.getByText("Stop"));

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith(
          expect.stringContaining(
            `less than ${APP_CONSTANTS.ACTIVITY_MIN_DURATION_MINUTES} minutes`,
          ),
        );
      });
      await waitFor(() =>
        expect(screen.getByTestId("current")).toHaveTextContent("none"),
      );
    });

    it("keeps the activity when the stop fails and it is still running", async () => {
      (stopActivityById as any).mockResolvedValue({
        success: false,
        message: "Failed to stop activity.",
      });

      await startWith(activityFixture({ id: "act-fail" }));
      (getCurrentActivity as any).mockResolvedValue({
        success: true,
        activity: activityFixture({ id: "act-fail" }),
      });

      await user.click(screen.getByText("Stop"));

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith("Failed to stop activity.");
      });
      expect(screen.getByTestId("current")).toHaveTextContent("act-fail");
    });

    it("clears the stale activity when the stop fails because it no longer exists", async () => {
      (stopActivityById as any).mockResolvedValue({
        success: false,
        message: "Failed to stop activity.",
      });

      await startWith(activityFixture({ id: "act-gone" }));
      await user.click(screen.getByText("Stop"));

      await waitFor(() =>
        expect(screen.getByTestId("current")).toHaveTextContent("none"),
      );
    });

    it("adopts the activity that is actually running when the local one is stale", async () => {
      (stopActivityById as any).mockResolvedValue({
        success: false,
        message: "Failed to stop activity.",
      });

      await startWith(activityFixture({ id: "act-stale" }));
      (getCurrentActivity as any).mockResolvedValue({
        success: true,
        activity: activityFixture({ id: "act-other-session" }),
      });

      await user.click(screen.getByText("Stop"));

      await waitFor(() =>
        expect(screen.getByTestId("current")).toHaveTextContent(
          "act-other-session",
        ),
      );
    });
  });

  describe("breaks", () => {
    it("opens a break and reports being on one", async () => {
      (startBreak as any).mockResolvedValue({
        success: true,
        activity: activityFixture({
          breakStartedAt: new Date(),
          breakPlannedMins: 15,
        }),
      });

      await startWith(activityFixture());
      expect(screen.getByTestId("on-break")).toHaveTextContent("no");

      await user.click(screen.getByText("Break"));

      await waitFor(() =>
        expect(screen.getByTestId("on-break")).toHaveTextContent("yes"),
      );
      expect(startBreak).toHaveBeenCalledWith("act-1", 15);
    });

    it("closes the break and adopts the returned break minutes", async () => {
      (endBreak as any).mockResolvedValue({
        success: true,
        activity: activityFixture({ breakMinutes: 15 }),
      });

      await startWith(
        activityFixture({ breakStartedAt: new Date(), breakPlannedMins: 15 }),
      );
      await user.click(screen.getByText("Resume"));

      await waitFor(() =>
        expect(screen.getByTestId("on-break")).toHaveTextContent("no"),
      );
      expect(endBreak).toHaveBeenCalledWith("act-1");
    });

    it("shows elapsed time net of completed breaks", async () => {
      await startWith(
        activityFixture({
          startTime: new Date(Date.now() - 60 * 60 * 1000),
          breakMinutes: 20,
        }),
      );

      // 60 minutes of wall clock, 20 of them on break.
      await waitFor(() =>
        expect(screen.getByTestId("elapsed")).toHaveTextContent("40"),
      );
    });

    it("keeps the error toast and resyncs when opening a break fails", async () => {
      (startBreak as any).mockResolvedValue({
        success: false,
        message: "A break is already in progress.",
      });

      await startWith(activityFixture());
      await user.click(screen.getByText("Break"));

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith(
          "A break is already in progress.",
        ),
      );
      expect(screen.getByTestId("on-break")).toHaveTextContent("no");
    });

    // Decision 13: visibilitychange never fires between two side-by-side
    // windows, so focus is the only signal the second one ever gets.
    it("resyncs from the server when the window regains focus", async () => {
      await startWith(activityFixture());
      (getCurrentActivity as any).mockClear();

      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });

      await waitFor(() => expect(getCurrentActivity).toHaveBeenCalled());
    });
  });

  // Decision 14: without this the ticking timer froze at 8h and never stopped
  // the activity, so a forgotten break locked the app for good.
  describe("auto-stop at the maximum duration", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("stops the activity when the running timer crosses the cap", async () => {
      (stopActivityById as any).mockResolvedValue({
        success: true,
        discarded: false,
      });
      (getCurrentActivity as any).mockResolvedValue({
        success: true,
        activity: activityFixture({
          startTime: new Date(
            Date.now() - APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS + 2000,
          ),
        }),
      });

      render(
        <ActivityProvider>
          <TestHarness />
        </ActivityProvider>,
      );

      await waitFor(() =>
        expect(screen.getByTestId("current")).toHaveTextContent("act-1"),
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      await waitFor(() => expect(stopActivityById).toHaveBeenCalled());
    });
  });
});
