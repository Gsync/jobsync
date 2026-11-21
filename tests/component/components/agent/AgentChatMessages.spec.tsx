import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AGENT_PASTE_PART_TYPE } from "@/models/agent.model";

const chat = {
  messages: [] as any[],
  status: "ready" as string,
  regenerate: vi.fn(),
  resumeStream: vi.fn(),
  addToolApprovalResponse: vi.fn(),
  interruptedTurn: false,
  stoppedReplies: new Map<string, string>(),
  dismissInterrupted: vi.fn(),
  toolStreams: {} as Record<string, string>,
};
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => chat,
}));
vi.mock("@/components/TipTapContentViewer", () => ({
  TipTapContentViewer: ({ content }: { content: string }) => (
    <div data-testid="tiptap-content" dangerouslySetInnerHTML={{ __html: content }} />
  ),
}));

import { AgentChatMessages } from "@/components/agent/AgentChatMessages";

const toolPart = (state: string, extra: Record<string, unknown> = {}) => ({
  type: "tool-add_job",
  toolCallId: "c1",
  state,
  input: { company: "Acme", jobTitle: "Platform Engineer" },
  ...extra,
});

const assistant = (parts: any[]) => ({ id: "a1", role: "assistant", parts });
const user = (parts: any[]) => ({ id: "u1", role: "user", parts });

const posting = "Senior Platform Engineer at Acme. We run payments reliability.";

describe("AgentChatMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.messages = [];
    chat.status = "ready";
    chat.interruptedTurn = false;
    chat.stoppedReplies = new Map();
    chat.toolStreams = {};
  });

  it("renders the running card while the tool input is still arriving", () => {
    chat.messages = [assistant([toolPart("input-available")])];
    render(<AgentChatMessages />);
    expect(screen.getByText(/preparing to add a job/i)).toBeInTheDocument();
  });

  it("renders the approval card for approval-requested", () => {
    chat.messages = [
      assistant([toolPart("approval-requested", { approval: { id: "ap1" } })]),
    ];
    render(<AgentChatMessages />);
    expect(screen.getByText("Needs approval")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("renders the result card for output-available", () => {
    chat.messages = [
      assistant([
        toolPart("output-available", {
          output: { created: true, jobId: "j1", resolutions: [] },
        }),
      ]),
    ];
    render(<AgentChatMessages />);
    expect(screen.getByText(/added/i)).toBeInTheDocument();
    expect(screen.queryByText("Needs approval")).not.toBeInTheDocument();
  });

  it("feeds the approval card the pasted text from the same thread", () => {
    chat.messages = [
      user([
        { type: "text", text: "add this" },
        {
          type: AGENT_PASTE_PART_TYPE,
          id: "p1",
          data: {
            id: "p1",
            text: posting,
            chars: posting.length,
            truncated: false,
          },
        },
      ]),
      assistant([toolPart("approval-requested", { approval: { id: "ap1" } })]),
    ];
    render(<AgentChatMessages />);
    expect(screen.getByText(/pasted verbatim/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(posting.slice(0, 30)))).toBeInTheDocument();
  });

  it("offers Continue on an interrupted turn and calls regenerate only on click", async () => {
    chat.interruptedTurn = true;
    chat.messages = [assistant([{ type: "text", text: "half a s" }])];
    render(<AgentChatMessages />);

    expect(chat.regenerate).not.toHaveBeenCalled();
    expect(chat.resumeStream).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(chat.regenerate).toHaveBeenCalled();
    expect(chat.resumeStream).not.toHaveBeenCalled();
  });

  it("lets the interrupted notice be dismissed", async () => {
    chat.interruptedTurn = true;
    chat.messages = [assistant([{ type: "text", text: "half a s" }])];
    render(<AgentChatMessages />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(chat.dismissInterrupted).toHaveBeenCalled();
  });

  it("offers Continue when a seeded transcript ends with a user message", () => {
    chat.messages = [user([{ type: "text", text: "add a job" }])];
    render(<AgentChatMessages />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("does not offer Continue while the reply is still in flight", () => {
    chat.status = "submitted";
    chat.messages = [user([{ type: "text", text: "add a job" }])];
    render(<AgentChatMessages />);
    expect(
      screen.queryByRole("button", { name: /continue/i }),
    ).not.toBeInTheDocument();
  });

  it("does not offer Continue after a completed assistant turn", () => {
    chat.messages = [
      user([{ type: "text", text: "add a job" }]),
      assistant([{ type: "text", text: "Done." }]),
    ];
    render(<AgentChatMessages />);
    expect(
      screen.queryByRole("button", { name: /continue/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the thinking row while the first assistant part is still pending", () => {
    chat.status = "submitted";
    chat.messages = [user([{ type: "text", text: "add a job" }])];
    render(<AgentChatMessages />);
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
  });

  it("shows the thinking row after a tool result while the reply is composed", () => {
    chat.status = "streaming";
    chat.messages = [
      assistant([
        toolPart("output-available", {
          output: { created: true, jobId: "j1", resolutions: [] },
        }),
      ]),
    ];
    render(<AgentChatMessages />);
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
  });

  it("does not double up on the running card, which spins already", () => {
    chat.status = "streaming";
    chat.messages = [assistant([toolPart("input-available")])];
    render(<AgentChatMessages />);
    expect(screen.getByText(/preparing to add a job/i)).toBeInTheDocument();
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
  });

  it("does not show the thinking row while an approval is on screen", () => {
    chat.status = "streaming";
    chat.messages = [
      assistant([toolPart("approval-requested", { approval: { id: "ap1" } })]),
    ];
    render(<AgentChatMessages />);
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
  });

  it("does not show the thinking row once text is arriving", () => {
    chat.status = "streaming";
    chat.messages = [assistant([{ type: "text", text: "I found the" }])];
    render(<AgentChatMessages />);
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
  });

  it("does not show the thinking row on a settled transcript", () => {
    chat.messages = [
      user([{ type: "text", text: "add a job" }]),
      assistant([{ type: "text", text: "Done." }]),
    ];
    render(<AgentChatMessages />);
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
  });

  it("renders assistant text as plain text, never as markdown media", () => {
    chat.messages = [
      assistant([{ type: "text", text: "![x](http://evil/a.png)" }]),
    ];
    const { container } = render(<AgentChatMessages />);
    expect(container.innerHTML).not.toContain("<img");
    expect(screen.getByTestId("tiptap-content")).toHaveTextContent(
      "![x](http://evil/a.png)",
    );
  });

  it("renders assistant markdown as formatted HTML", () => {
    chat.messages = [
      assistant([{ type: "text", text: "## Summary\n\n- one\n- two" }]),
    ];
    render(<AgentChatMessages />);
    const rendered = screen.getByTestId("tiptap-content");
    expect(rendered.innerHTML).toContain("<h2>Summary</h2>");
    expect(rendered.innerHTML).toContain("<li>one</li>");
  });

  it("leaves user text unformatted", () => {
    chat.messages = [user([{ type: "text", text: "## not a heading" }])];
    render(<AgentChatMessages />);
    expect(screen.queryByTestId("tiptap-content")).not.toBeInTheDocument();
    expect(screen.getByText("## not a heading")).toBeInTheDocument();
  });

  it("does not render a link the model emitted", () => {
    chat.messages = [
      assistant([{ type: "text", text: "[click](https://evil.example/?d=x)" }]),
    ];
    render(<AgentChatMessages />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // think:true means reasoning parts now reach the client. They are the
  // model's scratchpad, not its answer, and must never render as prose.
  it("renders nothing for a reasoning part", () => {
    chat.messages = [
      assistant([
        { type: "reasoning", text: "The user pasted a posting, so I omit jobDescription." },
        { type: "text", text: "Added." },
      ]),
    ];
    render(<AgentChatMessages />);
    expect(screen.getByText("Added.")).toBeInTheDocument();
    expect(screen.queryByText(/omit jobDescription/)).not.toBeInTheDocument();
  });

  // The transcript no longer parses assistant prose for a SCORES line at all
  // — the card comes from the tool part. A model that emits one anyway is
  // rendered as the plain text it is.
  it("renders no score card for a scores line in assistant prose", () => {
    chat.messages = [
      assistant([
        {
          type: "text",
          text: "SCORES: overall=78 impact=72 clarity=81 ats=69\n\nSolid resume.",
        },
      ]),
    ];
    render(<AgentChatMessages />);
    expect(screen.queryByText("Impact")).not.toBeInTheDocument();
  });

  it("renders a follow-up answer with no score card", () => {
    chat.messages = [
      assistant([
        { type: "text", text: "Your ATS score is held back by the tables." },
      ]),
    ];
    render(<AgentChatMessages />);
    expect(screen.queryByText("Impact")).not.toBeInTheDocument();
  });

  const reviewRunning = {
    type: "tool-review_resume",
    toolCallId: "rv1",
    state: "input-available",
    input: {},
  } as any;

  const progress = (id: string, steps: string[]) =>
    ({ type: "data-tool-progress", id, data: { steps } }) as any;
  const REVIEW = ["resume", "prepare", "generate", "check", "save"];
  const rows = () => screen.getAllByRole("listitem").map((row) => row.textContent);
  const marks = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-mark]")].map((m) => m.getAttribute("data-mark"));

  it("shows a review's steps from its progress part", () => {
    chat.status = "streaming";
    chat.messages = [
      user([{ type: "text", text: "Review Design Resume" }]),
      assistant([reviewRunning, progress("rv1", ["resume", "prepare"])]),
    ];
    const view = render(<AgentChatMessages />);
    expect(rows()).toEqual(["Loading resume…", "Preparing resume text…"]);
    expect(screen.getByText("Preparing resume text…").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();

    chat.toolStreams.rv1 = "SCORES: overall=78 impact=72 clarity=81 ats=69\n\nClear summary.";
    chat.messages[1] = assistant([reviewRunning, progress("rv1", REVIEW.slice(0, 4))]);
    view.rerender(<AgentChatMessages />);
    expect(screen.getByText("Clear summary.")).toAppearBefore(screen.getByText("Extracting scores…"));
    expect(screen.getByText("Generating review…")).toAppearBefore(screen.getByText("Clear summary."));
    expect(screen.getByText("Extracting scores…").closest("li")).toHaveAttribute("aria-current", "step");

    const output = { status: "ok", saved: true, body: "Clear summary." };
    chat.status = "ready";
    chat.messages[1] = assistant([
      { ...reviewRunning, state: "output-available", output }, progress("rv1", REVIEW),
    ]);
    view.rerender(<AgentChatMessages />);
    expect(rows()).toEqual([
      "Loading resume…", "Preparing resume text…", "Generating review…",
      "Extracting scores…", "Saving review…",
    ]);
    expect(screen.getByText("Clear summary.")).toAppearBefore(screen.getByText("Extracting scores…"));
    expect(view.container.querySelector('[aria-current="step"]')).toBeNull();
    expect(marks(view.container).every((m) => m === "done")).toBe(true);
  });

  it("keeps two tool calls' steps apart", () => {
    chat.messages = [assistant([
      { ...reviewRunning, state: "output-available", output: { status: "needs_selection", resumes: [{ id: "r1", title: "A" }] } },
      progress("rv1", ["resume"]),
      { type: "tool-review_resume", toolCallId: "rv2", state: "output-available", input: {}, output: { status: "ok", saved: true, body: "Done." } },
      progress("rv2", REVIEW),
    ])];
    render(<AgentChatMessages />);
    expect(screen.getAllByText("Loading resume…")).toHaveLength(2);
    expect(screen.getAllByText("Saving review…")).toHaveLength(1);
  });

  it("labels a pending direct invoke with the tool's running label", () => {
    chat.status = "submitted";
    chat.messages = [user([
      { type: "text", text: "Review Design Resume" },
      { type: "data-direct-invoke", data: { toolName: "review_resume", input: {} } },
    ])];
    render(<AgentChatMessages />);
    expect(screen.getByText("Reviewing your resume…")).toBeInTheDocument();
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
  });

  it("shows a warm-colored spinner while the assistant is thinking", () => {
    chat.status = "submitted";
    chat.messages = [user([{ type: "text", text: "Review Design Resume" }])];
    render(<AgentChatMessages />);

    const spinner = screen.getByText("Thinking…").parentElement?.querySelector("svg");
    expect(spinner).toHaveClass("animate-spin", "text-orange-600", "dark:text-amber-500");
  });

  it("shows no Thinking… while a tool's progress part is the tail", () => {
    chat.status = "streaming";
    chat.messages = [assistant([reviewRunning, progress("rv1", ["resume"])])];
    const view = render(<AgentChatMessages />);
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();

    chat.messages = [assistant([
      toolPart("approval-responded", { approval: { id: "ap1", approved: true } }),
      progress("c1", ["resolve"]),
    ])];
    view.rerender(<AgentChatMessages />);
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
  });

  it("marks a review interrupted when the reply was stopped", () => {
    chat.stoppedReplies = new Map([["a1", "interrupted"]]);
    chat.messages = [assistant([reviewRunning, progress("rv1", ["resume", "prepare"])])];
    const { container } = render(<AgentChatMessages />);
    expect(screen.getByText("Interrupted.")).toBeInTheDocument();
    expect(marks(container)).toEqual(["done", "interrupted"]);
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
  });

  it("marks a review timed out when the server reported the deadline", () => {
    chat.stoppedReplies = new Map([["a1", "timedOut"]]);
    chat.messages = [assistant([reviewRunning, progress("rv1", ["resume", "prepare"])])];
    render(<AgentChatMessages />);
    expect(screen.getByText("Timed out.")).toBeInTheDocument();
    expect(screen.queryByText("Interrupted.")).not.toBeInTheDocument();
  });

  it.each([
    ["generation_failed", { status: "generation_failed", title: "Resume", reason: "Could not generate." }],
    ["unreadable", { status: "unreadable", title: "Resume", reason: "Missing content." }],
  ])("marks the step a %s review broke at with a failure icon", (_, output) => {
    chat.messages = [assistant([
      { ...reviewRunning, state: "output-available", output }, progress("rv1", ["resume", "prepare"]),
    ])];
    const { container } = render(<AgentChatMessages />);
    expect(marks(container)).toEqual(["done", "failed"]);
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
  });

  it("keeps a neutral mark when the review stops to ask for a resume", () => {
    chat.messages = [assistant([
      { ...reviewRunning, state: "output-available", output: {
        status: "needs_selection", resumes: [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
      } },
      progress("rv1", ["resume"]),
    ])];
    const { container } = render(<AgentChatMessages />);
    expect(marks(container)).toEqual(["answer"]);
  });

  it("marks a review that timed out, distinct from interrupted", () => {
    chat.messages = [assistant([
      { ...reviewRunning, state: "output-available", output: {
        status: "generation_failed", timedOut: true, title: "Resume", reason: "The review timed out.",
      } },
      progress("rv1", ["resume", "prepare", "generate"]),
    ])];
    render(<AgentChatMessages />);
    expect(screen.getByText("Timed out.")).toBeInTheDocument();
    expect(screen.queryByText("Interrupted.")).not.toBeInTheDocument();
  });

  it("shows a save error after the review and the save attempt", () => {
    chat.messages = [assistant([
      { ...reviewRunning, state: "output-available", output: {
        status: "ok", body: "Clear summary.", saved: false, saveError: "Storage unavailable.",
      } },
      progress("rv1", REVIEW),
    ])];
    const { container } = render(<AgentChatMessages />);
    expect(screen.getByText("Clear summary.")).toAppearBefore(screen.getByText("Saving review…"));
    expect(screen.getByText(/Review not saved — Storage unavailable/)).toBeInTheDocument();
    expect(marks(container).at(-1)).toBe("failed");
  });

  it("renders the review as it streams, before the tool result exists", () => {
    chat.status = "streaming";
    chat.toolStreams = {
      rv1: "SCORES: overall=78 impact=72 clarity=81 ats=69\n\n## Summary\n\nSolid.",
    };
    chat.messages = [assistant([reviewRunning])];
    render(<AgentChatMessages />);
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.queryByText(/SCORES:/)).not.toBeInTheDocument();
    expect(screen.getByTestId("tiptap-content").innerHTML).toContain(
      "<h2>Summary</h2>",
    );
  });

  it("shows the running card until the first review token arrives", () => {
    chat.status = "streaming";
    chat.toolStreams = {};
    chat.messages = [assistant([reviewRunning])];
    render(<AgentChatMessages />);
    expect(screen.getByText(/reviewing your resume/i)).toBeInTheDocument();
  });

  it("renders a running match_job from its streamed text", () => {
    chat.toolStreams = {
      m1: "SCORES: match=72 recommendation=good\n\n## Summary\n\nStreaming.",
    };
    chat.messages = [
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-match_job",
            toolCallId: "m1",
            state: "input-available",
            input: {},
          },
        ],
      },
    ] as any;
    render(<AgentChatMessages />);
    expect(screen.getByText(/Streaming\./i)).toBeInTheDocument();
    expect(screen.queryByText(/SCORES:/)).not.toBeInTheDocument();
  });

  it("renders a running generate_cover_letter from its streamed text", () => {
    chat.toolStreams = {
      c1: "<think>planning</think>Dear Hiring Manager,\n\nI am writing.",
    };
    chat.messages = [
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-generate_cover_letter",
            toolCallId: "c1",
            state: "input-available",
            input: {},
          },
        ],
      },
    ] as any;
    render(<AgentChatMessages />);
    expect(screen.getByText(/Dear Hiring Manager/i)).toBeInTheDocument();
    expect(screen.queryByText(/planning/)).not.toBeInTheDocument();
  });
});
