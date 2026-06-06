import JobsAppliedCard from "@/components/dashboard/JobsAppliedCard";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("JobsAppliedCard", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
  });

  it("should navigate to myjobs with add-job=true when New Job button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobsAppliedCard />);

    await user.click(screen.getByRole("button", { name: /new job/i }));

    expect(mockPush).toHaveBeenCalledWith("/dashboard/myjobs?add-job=true");
  });

  it("should navigate to tasks page when New Task button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobsAppliedCard />);

    await user.click(screen.getByRole("button", { name: /new task/i }));

    expect(mockPush).toHaveBeenCalledWith("/dashboard/tasks");
  });
});
