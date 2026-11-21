import { render, screen } from "@testing-library/react";
import { AgentToolPart } from "@/components/agent/AgentToolPart";

vi.mock("@/components/agent/AgentChatProvider", () => ({ useAgentChat: vi.fn() }));
vi.mock("@/components/agent/AgentNestedStream", () => ({
  ReviewResumeStream: ({ text }: { text: string }) => <div data-testid="stream">{text}</div>,
  MatchJobStream: () => null,
  CoverLetterStream: () => null,
}));

const ALL_REVIEW = ["resume", "prepare", "generate", "check", "save"];

const part = (overrides: Record<string, unknown> = {}) =>
  ({
    type: "tool-review_resume",
    toolCallId: "c1",
    state: "input-available",
    input: {},
    ...overrides,
  }) as any;

function setup(
  props: Partial<React.ComponentProps<typeof AgentToolPart>> = {},
) {
  return render(
    <AgentToolPart
      part={part()}
      running={false}
      onRespond={vi.fn()}
      {...props}
    />,
  );
}

const marks = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-mark]")].map((el) =>
    el.getAttribute("data-mark"),
  );

const busy = {
  status: "generation_failed",
  title: "Senior Resume",
  reason: "Another analysis is running.",
  busy: true,
};

describe("AgentToolPart", () => {
  it("renders as before when no step was reported", () => {
    const running = setup({ running: true });
    expect(screen.getByText("Reviewing your resume…")).toBeInTheDocument();
    expect(running.container.querySelector("ol")).toBeNull();
    running.unmount();

    const streaming = setup({ running: true, streamed: "Strengths" });
    expect(screen.getByTestId("stream")).toHaveTextContent("Strengths");
    expect(streaming.container.querySelector("ol")).toBeNull();
    streaming.unmount();

    const done = setup({
      part: part({ state: "output-available", output: busy }),
    });
    expect(screen.getByText(/Another analysis is running/)).toBeInTheDocument();
    expect(done.container.querySelector("ol")).toBeNull();
  });

  it("renders as before when the step id is unknown", () => {
    const { container } = setup({ running: true, steps: ["renamed"] });
    expect(screen.getByText("Reviewing your resume…")).toBeInTheDocument();
    expect(container.querySelector("ol")).toBeNull();
  });

  it("renders as before when any saved id is unknown", () => {
    const { container } = setup({ running: true, steps: ["resume", "renamed"] });
    expect(screen.getByText("Reviewing your resume…")).toBeInTheDocument();
    expect(container.querySelector("ol")).toBeNull();
  });

  it("replaces the running card with progress once a step is reported", () => {
    const { container } = setup({ running: true, steps: ["resume"] });
    expect(screen.getByText("Loading resume…")).toBeInTheDocument();
    expect(screen.queryByText("Reviewing your resume…")).not.toBeInTheDocument();
    expect(marks(container)).toEqual(["running"]);
  });

  it("shows the stream between the before and after lists", () => {
    setup({ running: true, steps: ALL_REVIEW, streamed: "Strengths" });
    const before = screen.getByText("Generating review…");
    const stream = screen.getByTestId("stream");
    const after = screen.getByText("Extracting scores…");
    const follows = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(before.compareDocumentPosition(stream) & follows).toBeTruthy();
    expect(stream.compareDocumentPosition(after) & follows).toBeTruthy();
  });

  it.each(["live", "saved"])("links only the resume title in a %s progress step", (phase) => {
    const title = 'Senior "Backend" Engineer';
    const label = `Using resume "${title}" (default)`;
    setup({
      steps: ["resume", "prepare"],
      stepLabels: { resume: label },
      ...(phase === "live"
        ? { running: true, resumeId: "r7" }
        : {
            part: part({
              state: "output-available",
              output: { status: "ok", resumeId: "r7", title, body: "Review", saved: true },
            }),
          }),
    });
    const link = screen.getByRole("link", { name: title });
    expect(link).toHaveAttribute("href", "/dashboard/profile/resume/r7");
    expect(link.closest("li")).toHaveTextContent(label);
  });

  it("renders a persisted step with no spinner when not running", () => {
    const { container } = setup({
      part: part({ state: "output-available", output: busy }),
      steps: ["resume", "prepare"],
    });
    expect(marks(container)).toEqual(["done", "answer"]);
    expect(container.querySelector('[data-mark="failed"]')).toBeNull();
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(screen.getByText("Preparing resume text…")).toBeInTheDocument();
  });

  it("ends a failed tool call on a cross", () => {
    const { container } = setup({
      part: part({ state: "output-error", errorText: "boom" }),
      steps: ["resume"],
    });
    expect(marks(container)).toEqual(["failed"]);
  });

  it("passes progressStarted to the approval card", () => {
    const approval = (steps?: string[]) => ({
      part: part({
        type: "tool-add_job",
        state: "approval-responded",
        approval: { id: "ap1", approved: true },
        input: { company: "Acme", jobTitle: "Engineer" },
      }),
      steps,
    });
    const waiting = setup(approval());
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
    waiting.unmount();

    setup({ ...approval(["resolve"]), running: true });
    expect(screen.queryByText(/waiting/i)).not.toBeInTheDocument();
    expect(screen.getByText("Resolving job details…")).toBeInTheDocument();
  });
});
