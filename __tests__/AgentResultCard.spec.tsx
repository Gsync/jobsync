import { render, screen } from "@testing-library/react";

const sendMessage = vi.fn();
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => ({ sendMessage }),
}));

import { AgentResultCard } from "@/components/agent/AgentResultCard";

const resultPart = (output: unknown, state = "output-available") =>
  ({
    type: "tool-add_job",
    toolCallId: "c1",
    state,
    input: { company: "Acme", jobTitle: "Engineer" },
    output,
  }) as any;

describe("AgentResultCard", () => {
  it("names the created job, links to it, and reports the description", () => {
    render(
      <AgentResultCard
        part={resultPart({
          created: true,
          jobId: "job-123",
          resolutions: [
            { id: "c", label: "Acme", created: true },
            { id: "t", label: "Engineer", created: false },
          ],
          descriptionSource: "pasted",
          descriptionChars: 6200,
          descriptionCompleteness: "full",
        })}
      />,
    );
    expect(screen.getByText(/Engineer/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      expect.stringContaining("job-123"),
    );
    expect(screen.getByText(/6200|6,200/)).toBeInTheDocument();
    expect(screen.getByText(/full/i)).toBeInTheDocument();
  });

  it("names entities it newly created, not ones it matched", () => {
    render(
      <AgentResultCard
        part={resultPart({
          created: true,
          jobId: "job-1",
          resolutions: [
            { id: "c", label: "Acme", created: true },
            { id: "t", label: "Engineer", created: false },
          ],
        })}
      />,
    );
    expect(screen.getByText(/new/i).textContent).toContain("Acme");
    expect(screen.getByText(/new/i).textContent).not.toContain("Engineer");
  });

  it("reports a duplicate and says no second job was created", () => {
    render(
      <AgentResultCard
        part={resultPart({
          created: false,
          resolutions: [],
          duplicateOf: { id: "job-9", title: "Engineer", company: "Acme" },
        })}
      />,
    );
    expect(screen.getByText(/no second job/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      expect.stringContaining("job-9"),
    );
  });

  it("never leaks the helper's agent-facing guidance or a raw job id into the copy", () => {
    const { container } = render(
      <AgentResultCard
        part={resultPart({
          created: false,
          resolutions: [],
          duplicateOf: {
            id: "b7f1c2de-0000-4444-8888-abcdefabcdef",
            title: "Engineer",
            company: "Acme",
          },
        })}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("update_job");
    expect(text).not.toContain("allowDuplicate");
    expect(text).not.toContain("b7f1c2de-0000-4444-8888-abcdefabcdef");
  });

  it("renders the validation branch", () => {
    render(
      <AgentResultCard
        part={resultPart({
          created: false,
          resolutions: [],
          validationError: "dueDate: invalid datetime",
        })}
      />,
    );
    expect(screen.getByText(/dueDate/)).toBeInTheDocument();
  });

  it("renders a declined branch for output-denied", () => {
    render(<AgentResultCard part={resultPart(undefined, "output-denied")} />);
    expect(screen.getByText(/cancel|declin/i)).toBeInTheDocument();
  });

  it("renders a failed branch for output-error", () => {
    render(
      <AgentResultCard
        part={
          { ...resultPart(undefined, "output-error"), errorText: "boom" } as any
        }
      />,
    );
    expect(screen.getByText(/could not|failed/i)).toBeInTheDocument();
  });

  const getResumePart = (output: unknown) => ({
    type: "tool-get_resume",
    toolCallId: "c2",
    state: "output-available",
    input: {},
    output,
  });

  it("names the resume it read without dumping the text", () => {
    render(
      <AgentResultCard
        part={
          getResumePart({
            status: "ok",
            resumeId: "r1",
            title: "Senior Engineer Resume",
            resumeText: "SECRET RESUME BODY",
            chars: 18,
            truncated: false,
            source: "default",
          }) as any
        }
      />,
    );
    expect(screen.getByText(/Senior Engineer Resume/)).toBeInTheDocument();
    expect(screen.queryByText(/SECRET RESUME BODY/)).not.toBeInTheDocument();
  });

  it("offers a picker when the resume is ambiguous", () => {
    render(
      <AgentResultCard
        part={
          getResumePart({
            status: "needs_selection",
            resumes: [
              { id: "r1", title: "Engineer Resume" },
              { id: "r2", title: "PM Resume" },
            ],
          }) as any
        }
      />,
    );
    expect(screen.getByLabelText("Select a resume")).toBeInTheDocument();
  });

  it("says so when there are no resumes rather than inventing one", () => {
    render(<AgentResultCard part={getResumePart({ status: "no_resumes" }) as any} />);
    expect(screen.getByText(/don't have any resumes/i)).toBeInTheDocument();
  });

  it("renders the score card and the review body from a review result", () => {
    render(
      <AgentResultCard
        part={
          {
            type: "tool-review_resume",
            toolCallId: "c9",
            state: "output-available",
            input: {},
            output: {
              status: "ok",
              resumeId: "r1",
              title: "Senior Engineer Resume",
              scores: { overall: 78, impact: 72, clarity: 81, atsCompatibility: 69 },
              body: "## Summary\n\nSolid resume.",
              saved: true,
            },
          } as any
        }
      />,
    );
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.queryByText(/could not be saved/i)).not.toBeInTheDocument();
  });

  // On screen either way; silently unsaved is the bad outcome.
  it("says so when the review could not be saved", () => {
    render(
      <AgentResultCard
        part={
          {
            type: "tool-review_resume",
            toolCallId: "c9",
            state: "output-available",
            input: {},
            output: {
              status: "ok",
              resumeId: "r1",
              title: "Senior Engineer Resume",
              scores: { overall: 78, impact: 72, clarity: 81, atsCompatibility: 69 },
              body: "## Summary",
              saved: false,
              saveError: "Database is locked.",
            },
          } as any
        }
      />,
    );
    expect(screen.getByText(/not saved/i)).toBeInTheDocument();
    expect(screen.getByText(/database is locked/i)).toBeInTheDocument();
  });

  it("reports a failed review generation without a score card", () => {
    render(
      <AgentResultCard
        part={
          {
            type: "tool-review_resume",
            toolCallId: "c9",
            state: "output-available",
            input: {},
            output: {
              status: "generation_failed",
              title: "Senior Engineer Resume",
              reason: "The review could not be generated. Try again in a moment.",
            },
          } as any
        }
      />,
    );
    expect(screen.queryByText("Impact")).not.toBeInTheDocument();
    expect(screen.getByText(/could not be generated/i)).toBeInTheDocument();
  });
});
