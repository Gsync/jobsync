import JobStagesContainer from "@/components/admin/JobStagesContainer";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getJobStageTypeList,
  deleteJobStageTypeById,
  updateJobStageType,
} from "@/actions/jobStageType.actions";

vi.mock("@/actions/jobStageType.actions", () => ({
  getJobStageTypeList: vi.fn(),
  createJobStageType: vi.fn(),
  updateJobStageType: vi.fn(),
  deleteJobStageTypeById: vi.fn(),
}));

vi.mock("@/actions/job.actions", () => ({
  getStatusList: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastActionResult: vi.fn(),
}));

const types = [
  {
    id: "t-int",
    label: "Final / Onsite Interview",
    value: "final / onsite interview",
    sortOrder: 6,
    statusId: "s-int",
    Status: { id: "s-int", label: "Interview", value: "interview" },
    _count: { stages: 3 },
  },
  {
    id: "t-off",
    label: "Offer Received",
    value: "offer received",
    sortOrder: 9,
    statusId: "s-off",
    Status: { id: "s-off", label: "Offer", value: "offer" },
    _count: { stages: 0 },
  },
];

describe("JobStagesContainer", () => {
  const user = userEvent.setup({ skipHover: true });

  beforeEach(() => {
    vi.clearAllMocks();
    (getJobStageTypeList as any).mockResolvedValue({ data: types, total: 2 });
  });

  it("lists each stage type with its parent status, order and stage count", async () => {
    render(<JobStagesContainer />);

    expect(
      await screen.findByText("Final / Onsite Interview"),
    ).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("refuses to delete a type that is in use, naming the count", async () => {
    render(<JobStagesContainer />);
    await screen.findByText("Final / Onsite Interview");

    await user.click(screen.getAllByRole("button", { name: /toggle menu/i })[0]);
    await user.click(await screen.findByText("Delete"));

    expect(await screen.findByText(/used by 3 job stages/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete$/ })).toBeNull();
    expect(deleteJobStageTypeById).not.toHaveBeenCalled();
  });

  it("moves a type down by swapping sort order with its neighbour", async () => {
    (updateJobStageType as any).mockResolvedValue({ success: true });
    render(<JobStagesContainer />);
    await screen.findByText("Final / Onsite Interview");

    await user.click(screen.getAllByRole("button", { name: /toggle menu/i })[0]);
    await user.click(await screen.findByText("Move Down"));

    await waitFor(() =>
      expect(updateJobStageType).toHaveBeenCalledWith(
        "t-int",
        "Final / Onsite Interview",
        "s-int",
        9,
      ),
    );
    expect(updateJobStageType).toHaveBeenCalledWith(
      "t-off",
      "Offer Received",
      "s-off",
      6,
    );
  });

  it("searches stage types by label", async () => {
    render(<JobStagesContainer />);
    await screen.findByText("Final / Onsite Interview");

    await user.type(screen.getByPlaceholderText("Search stages..."), "onsite");

    await waitFor(() =>
      expect(getJobStageTypeList).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        "onsite",
      ),
    );
  });
});
