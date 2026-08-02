import { render, screen } from "@testing-library/react";
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
});
