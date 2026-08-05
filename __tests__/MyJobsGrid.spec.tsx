import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyJobsGrid from "@/components/myjobs/MyJobsGrid";
import type { JobResponse, JobStatus } from "@/models/job.model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockStatuses: JobStatus[] = [
  { id: "1", label: "Applied", value: "applied" },
  { id: "2", label: "Interview", value: "interview" },
];

function makeJob(overrides: Partial<JobResponse> = {}): JobResponse {
  return {
    id: "job-1",
    userId: "user-1",
    JobTitle: { id: "1", label: "Software Engineer", value: "software engineer" },
    Company: { id: "1", label: "Acme Corp", value: "acme corp", logoUrl: "" },
    Status: { id: "1", label: "Applied", value: "applied" },
    Location: { id: "1", label: "Remote", value: "remote" },
    JobSource: { id: "1", label: "Indeed", value: "indeed" },
    jobType: "FT",
    createdAt: new Date("2024-06-01"),
    appliedDate: new Date("2024-06-01"),
    dueDate: new Date("2099-01-01"),
    salaryRange: "",
    description: "",
    jobUrl: "",
    applied: true,
    ...overrides,
  } as JobResponse;
}

function renderGrid(jobs: JobResponse[]) {
  const deleteJob = vi.fn();
  render(
    <MyJobsGrid
      jobs={jobs}
      jobStatuses={mockStatuses}
      deleteJob={deleteJob}
      editJob={vi.fn()}
      onChangeJobStatus={vi.fn()}
      onAddNote={vi.fn()}
    />,
  );
  return { deleteJob };
}

describe("MyJobsGrid", () => {
  const user = userEvent.setup();

  it("renders one card per job", () => {
    renderGrid([
      makeJob(),
      makeJob({
        id: "job-2",
        JobTitle: { id: "2", label: "Data Analyst", value: "data analyst", createdBy: "user-1" },
      }),
    ]);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
    expect(screen.getAllByTestId("job-actions-menu-btn")).toHaveLength(2);
  });

  it("renders nothing but the dialog when there are no jobs", () => {
    renderGrid([]);

    expect(screen.queryByTestId("job-actions-menu-btn")).not.toBeInTheDocument();
  });

  it("confirms before deleting and passes the right job id", async () => {
    const { deleteJob } = renderGrid([
      makeJob(),
      makeJob({
        id: "job-2",
        JobTitle: { id: "2", label: "Data Analyst", value: "data analyst", createdBy: "user-1" },
      }),
    ]);

    await user.click(screen.getAllByTestId("job-actions-menu-btn")[1]);
    await user.click(screen.getByText("Delete"));

    expect(
      screen.getByText("Are you sure you want to delete this job?"),
    ).toBeInTheDocument();
    expect(deleteJob).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteJob).toHaveBeenCalledWith("job-2");
  });
});
