import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivitiesContainer from "@/components/activities/ActivitiesContainer";

const replace = vi.fn();
const router = { replace };
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));
vi.mock("@/actions/activity.actions", () => ({
  getActivitiesList: vi.fn(async () => ({ success: true, data: [], total: 0 })),
}));
vi.mock("@/context/ActivityContext", () => ({
  useActivity: () => ({ currentActivity: undefined, startActivity: vi.fn() }),
}));
vi.mock("@/hooks/useActivitySwitchConfirm", () => ({
  useActivitySwitchConfirm: () => ({ requestStart: vi.fn(), confirmDialog: null }),
}));
vi.mock("@/components/activities/ActivityForm", () => ({
  ActivityForm: () => <div data-testid="activity-form" />,
}));

describe("ActivitiesContainer ?add-activity=true", () => {
  it("opens the form once and strips the param", async () => {
    searchParams = new URLSearchParams("add-activity=true&x=1");
    const { rerender } = render(<ActivitiesContainer />);
    expect(await screen.findByTestId("activity-form")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("?x=1");

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByTestId("activity-form")).not.toBeInTheDocument(),
    );
    rerender(<ActivitiesContainer />);
    expect(screen.queryByTestId("activity-form")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("stays closed without the param", async () => {
    searchParams = new URLSearchParams();
    render(<ActivitiesContainer />);
    await screen.findByTestId("add-activity-btn");
    expect(screen.queryByTestId("activity-form")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
