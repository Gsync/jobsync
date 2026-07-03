import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyJobsTable from "@/components/myjobs/MyJobsTable";
import type { JobResponse, JobStatus } from "@/models/job.model";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

const mockStatuses: JobStatus[] = [
  { id: "1", label: "Applied", value: "applied" },
  { id: "2", label: "Interview", value: "interview" },
  { id: "3", label: "Draft", value: "draft" },
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

function renderTable(jobs: JobResponse[], overrides: Partial<React.ComponentProps<typeof MyJobsTable>> = {}) {
  const deleteJob = vi.fn();
  const editJob = vi.fn();
  const onChangeJobStatus = vi.fn();
  const onAddNote = vi.fn();
  const props: React.ComponentProps<typeof MyJobsTable> = {
    jobs,
    jobStatuses: mockStatuses,
    deleteJob,
    editJob,
    onChangeJobStatus,
    onAddNote,
    ...overrides,
  };
  const result = render(<MyJobsTable {...props} />);
  return { ...result, deleteJob, editJob, onChangeJobStatus, onAddNote };
}

describe("MyJobsTable", () => {
  it("renders a row per job with title, company, and location", () => {
    renderTable([makeJob()]);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
  });

  it("shows a Dismissed badge for discovered jobs regardless of status", () => {
    renderTable([makeJob({ discoveryStatus: "dismissed", Status: { id: "1", label: "Applied", value: "applied" } })]);

    expect(screen.getByText("Dismissed")).toBeInTheDocument();
    expect(screen.queryByText("Applied")).not.toBeInTheDocument();
  });

  it("shows an Expired badge for past-due draft jobs", () => {
    renderTable([
      makeJob({
        dueDate: new Date("2000-01-01"),
        Status: { id: "3", label: "Draft", value: "draft" },
      }),
    ]);

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("does not show Expired for past-due jobs that are not drafts", () => {
    renderTable([
      makeJob({
        dueDate: new Date("2000-01-01"),
        Status: { id: "1", label: "Applied", value: "applied" },
      }),
    ]);

    expect(screen.queryByText("Expired")).not.toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
  });

  it("renders a match score when present, and a dash otherwise", () => {
    const { rerender } = renderTable([makeJob({ matchScore: 87 })]);
    expect(screen.getByText("87%")).toBeInTheDocument();

    rerender(
      <MyJobsTable
        jobs={[makeJob({ matchScore: null })]}
        jobStatuses={mockStatuses}
        deleteJob={vi.fn()}
        editJob={vi.fn()}
        onChangeJobStatus={vi.fn()}
        onAddNote={vi.fn()}
      />,
    );
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows a notes count badge only when the job has notes", () => {
    const { rerender } = renderTable([makeJob({ _count: { Notes: 3 } })]);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(
      <MyJobsTable
        jobs={[makeJob({ _count: { Notes: 0 } })]}
        jobStatuses={mockStatuses}
        deleteJob={vi.fn()}
        editJob={vi.fn()}
        onChangeJobStatus={vi.fn()}
        onAddNote={vi.fn()}
      />,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  describe("row actions menu", () => {
    const user = userEvent.setup();

    it("navigates to job details when View Details is clicked", async () => {
      renderTable([makeJob()]);

      await user.click(screen.getByTestId("job-actions-menu-btn"));
      await user.click(screen.getByText("View Details"));

      expect(mockPush).toHaveBeenCalledWith("/dashboard/myjobs/job-1");
    });

    it("calls editJob with the job id when Edit Job is clicked", async () => {
      const { editJob } = renderTable([makeJob()]);

      await user.click(screen.getByTestId("job-actions-menu-btn"));
      await user.click(screen.getByText("Edit Job"));

      expect(editJob).toHaveBeenCalledWith("job-1");
    });

    it("calls onAddNote with the job id when Add a Note is clicked", async () => {
      const { onAddNote } = renderTable([makeJob()]);

      await user.click(screen.getByTestId("job-actions-menu-btn"));
      await user.click(screen.getByText("Add a Note"));

      expect(onAddNote).toHaveBeenCalledWith("job-1");
    });

    it("opens the delete confirmation dialog and calls deleteJob on confirm", async () => {
      const { deleteJob } = renderTable([makeJob()]);

      await user.click(screen.getByTestId("job-actions-menu-btn"));
      await user.click(screen.getByText("Delete"));

      expect(
        screen.getByText("Are you sure you want to delete this job?"),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Delete" }));

      expect(deleteJob).toHaveBeenCalledWith("job-1");
    });

    // The "Change status" item is a Radix submenu trigger; opening/selecting
    // via pointer clicks is flaky in jsdom, so drive it with the keyboard,
    // which is how Radix menus are designed to be operated.
    const openChangeStatusSubmenu = async () => {
      await user.click(screen.getByTestId("job-actions-menu-btn"));
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
      await user.keyboard("{ArrowRight}");
      await screen.findByText("Interview");
    };

    it("disables the current status option in the Change status submenu", async () => {
      renderTable([makeJob({ Status: { id: "1", label: "Applied", value: "applied" } })]);

      await openChangeStatusSubmenu();

      const appliedOption = screen.getAllByText("Applied").find(
        (el) => el.closest('[role="menuitem"]'),
      );
      expect(appliedOption?.closest('[role="menuitem"]')).toHaveAttribute(
        "data-disabled",
      );
    });

    it("calls onChangeJobStatus with the job id and selected status", async () => {
      const { onChangeJobStatus } = renderTable([
        makeJob({ Status: { id: "1", label: "Applied", value: "applied" } }),
      ]);

      await openChangeStatusSubmenu();
      await user.keyboard("{Enter}");

      expect(onChangeJobStatus).toHaveBeenCalledWith("job-1", {
        id: "2",
        label: "Interview",
        value: "interview",
      });
    });
  });
});
