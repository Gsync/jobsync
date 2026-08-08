import React from "react";
import JobDetails from "@/components/myjobs/JobDetails";
import { JobResponse, Tag } from "@/models/job.model";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => "/dashboard/myjobs/job-1"),
}));

const chat = {
  open: vi.fn(),
  clear: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn(),
  approvalPending: false,
};

vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => chat,
}));

vi.mock("@/components/myjobs/GenerateCoverLetterSection", () => ({
  GenerateCoverLetterSection: ({ open }: { open: boolean }) =>
    open ? <div data-testid="cover-letter-sheet" /> : null,
}));

vi.mock("@/components/myjobs/NotesSection", () => ({
  NotesSection: () => null,
}));

vi.mock("@/components/TipTapContentViewer", () => ({
  TipTapContentViewer: () => null,
}));

vi.mock("@/components/automations/MatchDetails", () => ({
  MatchDetails: () => <div data-testid="match-details" />,
}));

vi.mock("@/components/profile/DownloadFileButton", () => ({
  DownloadFileButton: () => null,
}));

vi.mock("@/components/CircularScore", () => ({
  CircularScore: ({ score }: { score: number }) => (
    <div data-testid="circular-score">{score}%</div>
  ),
}));

const baseProps = {
  jobStatuses: [],
  companies: [],
  titles: [],
  locations: [],
  sources: [],
  tags: [],
};

const makeJob = (overrides: Partial<JobResponse> = {}): JobResponse => ({
  id: "job-1",
  userId: "user-1",
  JobTitle: {
    id: "t1",
    label: "Frontend Developer",
    value: "frontend developer",
    createdBy: "user-1",
  },
  Company: {
    id: "c1",
    label: "Acme Corp",
    value: "acme corp",
    createdBy: "user-1",
  },
  Status: { id: "s1", label: "Applied", value: "applied" },
  Location: { id: "l1", label: "Remote", value: "remote", createdBy: "user-1" },
  JobSource: {
    id: "src1",
    label: "LinkedIn",
    value: "linkedin",
    createdBy: "user-1",
  },
  jobType: "FT",
  createdAt: new Date("2025-01-01"),
  appliedDate: new Date("2025-01-15"),
  dueDate: new Date("2099-12-31"), // far future — not expired
  salaryRange: "3",
  description: "<p>Job description</p>",
  jobUrl: "",
  applied: true,
  tags: [],
  ...overrides,
});

describe("JobDetails – skill badges", () => {
  it("renders skill badges for all tags on the job", () => {
    const tags: Tag[] = [
      { id: "tag-1", label: "React", value: "react", createdBy: "user-1" },
      {
        id: "tag-2",
        label: "TypeScript",
        value: "typescript",
        createdBy: "user-1",
      },
      { id: "tag-3", label: "Node.js", value: "node.js", createdBy: "user-1" },
    ];
    render(<JobDetails {...baseProps} job={makeJob({ tags })} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("renders no tag badges when the job has no tags", () => {
    render(<JobDetails {...baseProps} job={makeJob({ tags: [] })} />);

    // Verify tag area is simply absent; badges for these labels shouldn't exist
    expect(screen.queryByText("React")).not.toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
  });

  it("renders no tag badges when tags property is undefined", () => {
    const job = makeJob();
    delete job.tags;
    render(<JobDetails {...baseProps} job={job} />);

    // Should render without crashing and show no skill badges
    expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
  });

  it("renders a single skill badge correctly", () => {
    const tags: Tag[] = [
      { id: "tag-1", label: "GraphQL", value: "graphql", createdBy: "user-1" },
    ];
    render(<JobDetails {...baseProps} job={makeJob({ tags })} />);

    expect(screen.getByText("GraphQL")).toBeInTheDocument();
  });

  it("renders each tag label exactly once", () => {
    const tags: Tag[] = [
      { id: "tag-1", label: "React", value: "react", createdBy: "user-1" },
      { id: "tag-2", label: "Vue", value: "vue", createdBy: "user-1" },
    ];
    render(<JobDetails {...baseProps} job={makeJob({ tags })} />);

    // getAllByText returns an array; each label should appear exactly once in the badge area
    expect(screen.getAllByText("React")).toHaveLength(1);
    expect(screen.getAllByText("Vue")).toHaveLength(1);
  });
});

describe("JobDetails – match data display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.clear.mockResolvedValue(undefined);
  });

  it("shows inline match analysis when job has matchData", () => {
    const matchData = JSON.stringify({
      matchScore: 85,
      summary: "Good match",
    });
    render(<JobDetails {...baseProps} job={makeJob({ matchScore: 85, matchData })} />);

    expect(screen.getByText("AI Match Analysis")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByTestId("match-details")).toBeInTheDocument();
  });

  it("does not show inline match section when job has no matchData", () => {
    render(<JobDetails {...baseProps} job={makeJob()} />);

    expect(screen.queryByText("AI Match Analysis")).not.toBeInTheDocument();
    expect(screen.queryByTestId("match-details")).not.toBeInTheDocument();
  });

  it("shows the saved match score from the job prop", () => {
    render(
      <JobDetails
        job={makeJob({
          matchScore: 72,
          matchData: JSON.stringify({
            matchScore: 72,
            recommendation: "good match",
            body: "## Summary",
          }),
        })}
        {...baseProps}
      />,
    );
    expect(screen.getByTestId("circular-score")).toHaveTextContent("72%");
    expect(screen.getByTestId("match-details")).toBeInTheDocument();
  });
});

describe("JobDetails – Match with AI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.clear.mockResolvedValue(undefined);
  });

  it("opens the chat and asks for a match when Match with AI is clicked", async () => {
    chat.approvalPending = false;
    render(<JobDetails job={makeJob()} {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /match with ai/i }));
    await act(async () => {});
    expect(chat.open).toHaveBeenCalled();
    expect(chat.clear).toHaveBeenCalled();
    const sent = chat.sendMessage.mock.calls[0][0];
    expect(sent.parts[0].text).toMatch(/match/i);
  });

  // The panel opens first so a failed clear cannot leave the button dead, and
  // the match still goes out.
  it("still asks for the match when clearing the conversation fails", async () => {
    chat.approvalPending = false;
    chat.clear.mockRejectedValueOnce(new Error("offline"));
    render(<JobDetails job={makeJob()} {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /match with ai/i }));
    await act(async () => {});
    expect(chat.open).toHaveBeenCalled();
    expect(chat.sendMessage).toHaveBeenCalled();
  });

  it("asks before clearing a conversation with a pending approval", async () => {
    chat.approvalPending = true;
    render(<JobDetails job={makeJob()} {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /match with ai/i }));
    expect(
      screen.getByText(/clear the assistant conversation/i),
    ).toBeInTheDocument();
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });
});

describe("JobDetails cover letter action", () => {
  it("stays enabled when no resume is linked", () => {
    render(<JobDetails {...baseProps} job={makeJob({ resumeId: undefined })} />);
    expect(screen.getByTestId("generate-cover-letter-btn")).toBeEnabled();
  });

  it("disables the action for a title-only description", () => {
    render(
      <JobDetails
        {...baseProps}
        job={makeJob({
          resumeId: "resume-1",
          descriptionCompleteness: "title-only",
        })}
      />,
    );
    expect(screen.getByTestId("generate-cover-letter-btn")).toBeDisabled();
  });

  it("enables the action for a real description", () => {
    render(
      <JobDetails {...baseProps} job={makeJob({ resumeId: "resume-1" })} />,
    );
    expect(screen.getByTestId("generate-cover-letter-btn")).toBeEnabled();
  });

  it("opens the sheet on click", async () => {
    render(
      <JobDetails {...baseProps} job={makeJob({ resumeId: "resume-1" })} />,
    );
    await userEvent.click(screen.getByTestId("generate-cover-letter-btn"));
    expect(screen.getByTestId("cover-letter-sheet")).toBeInTheDocument();
  });

  it("labels the action Regenerate when a letter is already linked", () => {
    render(
      <JobDetails
        {...baseProps}
        job={makeJob({ resumeId: "resume-1", coverLetterId: "cl-1" })}
      />,
    );
    expect(screen.getByTestId("generate-cover-letter-btn")).toHaveTextContent(
      /regenerate/i,
    );
  });
});
