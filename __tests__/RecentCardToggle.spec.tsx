import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecentCardToggle from "@/components/dashboard/RecentCardToggle";
import { useActivity } from "@/context/ActivityContext";

vi.mock("@/context/ActivityContext", () => ({
  useActivity: vi.fn(),
}));

describe("RecentCardToggle - Start Activity", () => {
  const user = userEvent.setup();
  const mockStartActivity = vi.fn();
  const mockStopActivity = vi.fn();

  const activities = [
    {
      id: "activity-1",
      activityName: "Resume Review",
      duration: 30,
      endTime: new Date("2026-07-01T10:00:00"),
      activityType: { label: "Job Search" },
    },
  ];

  const renderComponent = () => {
    render(<RecentCardToggle jobs={[]} activities={activities} />);
  };

  const switchToActivitiesTab = async () => {
    await user.click(screen.getByRole("button", { name: "Activities" }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts the activity directly when nothing is currently in progress", async () => {
    (useActivity as any).mockReturnValue({
      currentActivity: undefined,
      startActivity: mockStartActivity,
      stopActivity: mockStopActivity,
    });

    renderComponent();
    await switchToActivitiesTab();

    await user.click(screen.getByTitle("Start Activity"));

    expect(mockStartActivity).toHaveBeenCalledWith("activity-1");
    expect(mockStopActivity).not.toHaveBeenCalled();
  });

  it("shows a confirm dialog naming the running activity instead of starting immediately", async () => {
    (useActivity as any).mockReturnValue({
      currentActivity: { id: "current-1", activityName: "Deep Work" },
      startActivity: mockStartActivity,
      stopActivity: mockStopActivity,
    });

    renderComponent();
    await switchToActivitiesTab();

    await user.click(screen.getByTitle("Start Activity"));

    expect(mockStartActivity).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/"Deep Work" is currently in progress/i)
    ).toBeInTheDocument();
  });

  it("stops the running activity then starts the new one on confirm", async () => {
    (useActivity as any).mockReturnValue({
      currentActivity: { id: "current-1", activityName: "Deep Work" },
      startActivity: mockStartActivity,
      stopActivity: mockStopActivity,
    });

    renderComponent();
    await switchToActivitiesTab();

    await user.click(screen.getByTitle("Start Activity"));

    const confirmButton = await screen.findByRole("button", {
      name: "Stop & Start",
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockStopActivity).toHaveBeenCalledTimes(1);
      expect(mockStartActivity).toHaveBeenCalledWith("activity-1");
    });
  });
});
