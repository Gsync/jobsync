import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateMockDataButton } from "@/components/developer/GenerateMockDataButton";
import {
  generateMockActivitiesAction,
  generateMockJobsAction,
  generateMockProfileDataAction,
} from "@/actions/mock.actions";
import { toastActionResult } from "@/lib/toast";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/toast", () => ({ toastActionResult: vi.fn() }));
vi.mock("@/actions/mock.actions", () => ({
  generateMockProfileDataAction: vi.fn(),
  generateMockActivitiesAction: vi.fn(),
  generateMockJobsAction: vi.fn(),
}));

const ok = { success: true, message: "ok" };

describe("GenerateMockDataButton", () => {
  it("runs profile, activities, then jobs", async () => {
    const order: string[] = [];
    vi.mocked(generateMockProfileDataAction).mockImplementation(async () => {
      order.push("profile");
      return ok;
    });
    vi.mocked(generateMockActivitiesAction).mockImplementation(async () => {
      order.push("activities");
      return ok;
    });
    vi.mocked(generateMockJobsAction).mockImplementation(async () => {
      order.push("jobs");
      return ok;
    });
    render(<GenerateMockDataButton />);
    await userEvent.click(screen.getByText("Generate mock data"));
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(toastActionResult).toHaveBeenCalled());
    expect(order).toEqual(["profile", "activities", "jobs"]);
  });

  it("stops at the first failure", async () => {
    const fail = { success: false, message: "boom" };
    vi.mocked(generateMockProfileDataAction).mockResolvedValue(fail);
    vi.mocked(generateMockActivitiesAction).mockClear();
    vi.mocked(generateMockJobsAction).mockClear();
    render(<GenerateMockDataButton />);
    await userEvent.click(screen.getByText("Generate mock data"));
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() =>
      expect(toastActionResult).toHaveBeenLastCalledWith(fail, expect.anything()),
    );
    expect(generateMockActivitiesAction).not.toHaveBeenCalled();
    expect(generateMockJobsAction).not.toHaveBeenCalled();
  });
});
