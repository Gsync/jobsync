import { render, screen } from "@testing-library/react";
import { JobCard } from "@/components/myjobs/JobCard";
import type { JobResponse, JobStatus } from "@/models/job.model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
    createdAt: new Date(2024, 5, 1),
    appliedDate: new Date(2024, 5, 1),
    dueDate: new Date("2099-01-01"),
    salaryRange: "",
    description: "",
    jobUrl: "",
    applied: true,
    ...overrides,
  } as JobResponse;
}

function renderCard(job: JobResponse) {
  return render(
    <JobCard
      job={job}
      jobStatuses={mockStatuses}
      editJob={vi.fn()}
      onChangeJobStatus={vi.fn()}
      onAddNote={vi.fn()}
      onDeleteJob={vi.fn()}
    />,
  );
}

describe("JobCard", () => {
  it("renders the title as a link to the job details page", () => {
    renderCard(makeJob());

    const link = screen.getByRole("link", { name: "Software Engineer" });
    expect(link).toHaveAttribute("href", "/dashboard/myjobs/job-1");
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Indeed")).toBeInTheDocument();
  });

  it("shows the applied date when present and 'Not applied' otherwise", () => {
    const { unmount } = renderCard(makeJob());
    expect(screen.getByText("Jun 1, 2024")).toBeInTheDocument();
    unmount();

    renderCard(makeJob({ appliedDate: null as unknown as Date }));
    expect(screen.getByText("Not applied")).toBeInTheDocument();
  });

  it("renders the match score, or an empty ring when there is none", () => {
    const { unmount } = renderCard(makeJob({ matchScore: 87 }));
    expect(screen.getByText("87%")).toBeInTheDocument();
    unmount();

    renderCard(makeJob({ matchScore: null }));
    expect(screen.getByTitle("No match score")).toBeInTheDocument();
  });

  it("shows a Dismissed badge for dismissed discovered jobs", () => {
    renderCard(makeJob({ discoveryStatus: "dismissed" }));

    expect(screen.getByText("Dismissed")).toBeInTheDocument();
    expect(screen.queryByText("Applied")).not.toBeInTheDocument();
  });

  it("shows an Expired badge for past-due draft jobs", () => {
    renderCard(
      makeJob({
        dueDate: new Date("2000-01-01"),
        Status: { id: "3", label: "Draft", value: "draft" },
      }),
    );

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("shows a notes count badge only when the job has notes", () => {
    const { unmount } = renderCard(makeJob({ _count: { Notes: 3 } }));
    expect(screen.getByText("3")).toBeInTheDocument();
    unmount();

    renderCard(makeJob({ _count: { Notes: 0 } }));
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders the shared actions menu trigger", () => {
    renderCard(makeJob());

    expect(screen.getByTestId("job-actions-menu-btn")).toBeInTheDocument();
  });
});
