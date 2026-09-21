import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InterviewsContainer from "@/components/interviews/InterviewsContainer";
import { getInterviewList } from "@/actions/interview.actions";

vi.mock("@/actions/interview.actions", () => ({
  getInterviewList: vi.fn(),
}));
// AddStageDialog imports addJobStage and updateJobStage from this module too,
// and Vitest throws on any export the factory leaves out.
vi.mock("@/actions/jobStage.actions", () => ({
  setStageOutcome: vi.fn(),
  addJobStage: vi.fn(),
  updateJobStage: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const row = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  jobId: "j1",
  stageTypeId: "t1",
  // Relative, never a literal: a hardcoded "future" date stops being future.
  occurredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  isCurrent: true,
  outcome: null,
  notes: null,
  durationMins: 60,
  format: "Video",
  location: "Google Meet",
  createdAt: new Date("2026-09-01T00:00:00"),
  updatedAt: new Date("2026-09-01T00:00:00"),
  StageType: {
    id: "t1",
    label: "2nd Technical Interview",
    value: "2nd technical interview",
    statusId: "st",
    sortOrder: 5,
  },
  interviewers: [],
  prepQuestions: [],
  Job: {
    id: "j1",
    JobTitle: { label: "Senior Full Stack Developer" },
    Company: { id: "c1", label: "Northwind Labs" },
  },
  ...over,
});

const props = {
  rounds: [{ id: "t1", label: "2nd Technical Interview" }],
  companies: [{ id: "c1", label: "Northwind Labs" }],
  stageTypes: [],
  jobStatuses: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  (getInterviewList as any).mockResolvedValue({ data: [row()], total: 1 });
});

describe("InterviewsContainer", () => {
  it("opens on the Upcoming view", async () => {
    render(<InterviewsContainer {...props} />);

    await waitFor(() =>
      expect(getInterviewList).toHaveBeenCalledWith(
        "upcoming",
        1,
        expect.any(Number),
        undefined,
        undefined,
        undefined,
      ),
    );
  });

  it("renders a round with its derived outcome", async () => {
    render(<InterviewsContainer {...props} />);

    expect(
      await screen.findByText("Senior Full Stack Developer"),
    ).toBeInTheDocument();
    expect(screen.getByText("Google Meet")).toBeInTheDocument();
    // occurredAt is in the future relative to nothing stored, so it derives
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("refetches with the new view when a segment is picked", async () => {
    render(<InterviewsContainer {...props} />);
    await screen.findByText("Senior Full Stack Developer");

    await userEvent.click(screen.getByRole("tab", { name: "Past" }));

    await waitFor(() =>
      expect(getInterviewList).toHaveBeenLastCalledWith(
        "past",
        1,
        expect.any(Number),
        undefined,
        undefined,
        undefined,
      ),
    );
  });

  it("expands one row at a time", async () => {
    (getInterviewList as any).mockResolvedValue({
      data: [row(), row({ id: "s2", Job: { ...row().Job, id: "j2" } })],
      total: 2,
    });
    render(<InterviewsContainer {...props} />);
    await screen.findAllByText("Senior Full Stack Developer");

    const [first, second] = screen.getAllByRole("button", {
      name: /Expand Senior Full Stack Developer/,
    });
    await userEvent.click(first!);
    expect(await screen.findByText(/Prep questions/)).toBeInTheDocument();

    await userEvent.click(second!);
    await waitFor(() =>
      expect(screen.getAllByText(/Prep questions/)).toHaveLength(1),
    );
  });

  it("tells the user when there are no interviews at all", async () => {
    (getInterviewList as any).mockResolvedValue({ data: [], total: 0 });
    render(<InterviewsContainer {...props} />);

    expect(await screen.findByText(/No interviews yet/)).toBeInTheDocument();
  });
});
