import React from "react";
import JobDetails from "@/components/myjobs/JobDetails";
import { JobResponse, Tag } from "@/models/job.model";
import { render, screen, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ back: vi.fn() })),
}));

let capturedOnMatchSaved: ((score: number, data: string) => void) | undefined;

vi.mock("@/components/profile/AiJobMatchSection", () => ({
  AiJobMatchSection: (props: any) => {
    capturedOnMatchSaved = props.onMatchSaved;
    return null;
  },
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
    render(<JobDetails job={makeJob({ tags })} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("renders no tag badges when the job has no tags", () => {
    render(<JobDetails job={makeJob({ tags: [] })} />);

    // Verify tag area is simply absent; badges for these labels shouldn't exist
    expect(screen.queryByText("React")).not.toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
  });

  it("renders no tag badges when tags property is undefined", () => {
    const job = makeJob();
    delete job.tags;
    render(<JobDetails job={job} />);

    // Should render without crashing and show no skill badges
    expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
  });

  it("renders a single skill badge correctly", () => {
    const tags: Tag[] = [
      { id: "tag-1", label: "GraphQL", value: "graphql", createdBy: "user-1" },
    ];
    render(<JobDetails job={makeJob({ tags })} />);

    expect(screen.getByText("GraphQL")).toBeInTheDocument();
  });

  it("renders each tag label exactly once", () => {
    const tags: Tag[] = [
      { id: "tag-1", label: "React", value: "react", createdBy: "user-1" },
      { id: "tag-2", label: "Vue", value: "vue", createdBy: "user-1" },
    ];
    render(<JobDetails job={makeJob({ tags })} />);

    // getAllByText returns an array; each label should appear exactly once in the badge area
    expect(screen.getAllByText("React")).toHaveLength(1);
    expect(screen.getAllByText("Vue")).toHaveLength(1);
  });
});

describe("JobDetails – match data display", () => {
  beforeEach(() => {
    capturedOnMatchSaved = undefined;
  });

  it("shows inline match analysis when job has matchData", () => {
    const matchData = JSON.stringify({
      matchScore: 85,
      summary: "Good match",
    });
    render(<JobDetails job={makeJob({ matchScore: 85, matchData })} />);

    expect(screen.getByText("AI Match Analysis")).toBeInTheDocument();
    expect(screen.getByText("85% Match")).toBeInTheDocument();
    expect(screen.getByTestId("match-details")).toBeInTheDocument();
  });

  it("does not show inline match section when job has no matchData", () => {
    render(<JobDetails job={makeJob()} />);

    expect(screen.queryByText("AI Match Analysis")).not.toBeInTheDocument();
    expect(screen.queryByTestId("match-details")).not.toBeInTheDocument();
  });

  it("updates inline match display when onMatchSaved is called", () => {
    render(<JobDetails job={makeJob()} />);

    // Initially no match section
    expect(screen.queryByText("AI Match Analysis")).not.toBeInTheDocument();

    // Simulate save callback from AiJobMatchSection
    const newMatchData = JSON.stringify({
      matchScore: 72,
      summary: "Partial match",
    });

    act(() => {
      capturedOnMatchSaved?.(72, newMatchData);
    });

    expect(screen.getByText("AI Match Analysis")).toBeInTheDocument();
    expect(screen.getByText("72% Match")).toBeInTheDocument();
    expect(screen.getByTestId("match-details")).toBeInTheDocument();
  });

  it("overwrites existing match data when onMatchSaved is called", () => {
    const oldMatchData = JSON.stringify({
      matchScore: 60,
      summary: "Old match",
    });
    render(<JobDetails job={makeJob({ matchScore: 60, matchData: oldMatchData })} />);

    expect(screen.getByText("60% Match")).toBeInTheDocument();

    const newMatchData = JSON.stringify({
      matchScore: 90,
      summary: "New match",
    });

    act(() => {
      capturedOnMatchSaved?.(90, newMatchData);
    });

    expect(screen.queryByText("60% Match")).not.toBeInTheDocument();
    expect(screen.getByText("90% Match")).toBeInTheDocument();
  });
});
