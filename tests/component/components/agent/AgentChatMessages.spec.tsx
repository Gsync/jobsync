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

  it("shows timings on checked steps, including the final step once the result arrives", () => {
    const timed = progress("rv1", REVIEW);
    timed.data.durationSeconds = { generate: 26, save: 1 };
    chat.status = "streaming";
    chat.messages = [assistant([reviewRunning, timed])];
    const view = render(<AgentChatMessages />);
    expect(screen.getByText("Generating review…").closest("li")).toHaveTextContent("26s");
    expect(screen.queryByText(/1s/)).not.toBeInTheDocument();

    chat.status = "ready";
    chat.messages = [assistant([
      { ...reviewRunning, state: "output-available", output: { status: "ok", saved: true, body: "Done." } },
      timed,
    ])];
    view.rerender(<AgentChatMessages />);
    expect(screen.getByText("Saving review…").closest("li")).toHaveTextContent("1s");
  });

  it("shows a review's steps from its progress part", () => {
    chat.status = "streaming";
    chat.messages = [
      user([{ type: "text", text: "Review Design Resume" }]),
      assistant([reviewRunning, progress("rv1", ["resume", "prepare"])]),
    ];
    const view = render(<AgentChatMessages />);
    expect(rows()).toEqual(["Loading resume…", "Preparing resume text…"]);
    expect(screen.getByText("review_resume")).toAppearBefore(screen.getByText("Loading resume…"));
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
    expect(screen.getByText("review_resume")).toBeInTheDocument();
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

  describe("held questions followed by silence", () => {
    const cand = (id: string, question: string, hasAnswer: boolean, canReplace?: boolean) =>
      ({ id, question, score: 0.5, hasAnswer, ...(canReplace === undefined ? {} : { canReplace }) });
    const similar = (index: number, question: string, candidates: any[], hasIncomingAnswer?: boolean) =>
      ({ index, question, status: "similar", candidates, saved: false, ...(hasIncomingAnswer === undefined ? {} : { hasIncomingAnswer }) });
    const call = (id: string, questions: any[], items: any[]) => ({
      type: "tool-add_question", toolCallId: id, state: "output-available",
      input: { questions }, output: { items, note: "Not saved yet: 1." },
    });
    const thought = { type: "reasoning", text: "I should ask the user what to do." };
    const waiting = () => screen.queryByRole("note", { name: "Questions waiting on your reply" });
    const DEPLOY = "How do you handle a failing deployment?";

    it("offers each target's own choices after a held result with only reasoning", () => {
      chat.messages = [assistant([
        call("c1", [{ question: DEPLOY, answer: "Roll back first." }], [similar(1, DEPLOY, [
          cand("q-1", "How do you handle a failing deploy?", true, true),
          cand("q-2", "How do you handle a broken release?", false, false),
        ], true)]),
        thought,
      ])];
      render(<AgentChatMessages />);
      const note = waiting()!;
      expect(note).toHaveTextContent(DEPLOY);
      const line = (text: string) => screen.getByText((_, el) => el?.tagName === "LI" && (el.textContent ?? "").startsWith(`“${text}”`));
      expect(line("How do you handle a failing deploy?")).toHaveTextContent("add below the saved answer, replace the saved answer");
      expect(line("How do you handle a broken release?")).toHaveTextContent("add your answer as its first answer");
      expect(line("How do you handle a broken release?")).not.toHaveTextContent("replace");
      expect(note).toHaveTextContent(/save as new/i);
      expect(note).toHaveTextContent(/skip/i);
    });

    it("lists only the held items of a mixed batch, each with its own choices", () => {
      chat.messages = [assistant([
        call("c1", [
          { question: "Tell me about yourself" },
          { question: "Why Postgres over Mongo?", answer: "Relational integrity." },
          { question: "Why do you want to leave your job?" },
        ], [
          { index: 1, question: "Tell me about yourself", status: "saved", tags: [], droppedTags: [], saved: true },
          { index: 2, question: "Why Postgres over Mongo?", status: "exists", saved: false,
            existing: { id: "q-3", question: "Why Postgres over Mongo?", hasAnswer: true, canReplace: false } },
          similar(3, "Why do you want to leave your job?", [cand("q-4", "Why do you want to work here?", false, false)], false),
        ]),
        thought,
      ])];
      render(<AgentChatMessages />);
      const note = waiting()!;
      expect(note).not.toHaveTextContent("Tell me about yourself");
      expect(note).toHaveTextContent("Why Postgres over Mongo?");
      expect(note).toHaveTextContent("add below the saved answer");
      expect(note).not.toHaveTextContent("replace");
      expect(note).toHaveTextContent("Why do you want to leave your job?");
      expect(note).not.toHaveTextContent("first answer");
    });

    it("drops a question a later re-call settled and keeps the other", () => {
      chat.messages = [assistant([
        call("c1", [{ question: "Question A here" }, { question: "Question B here" }], [
          similar(1, "Question A here", [cand("q-a", "Saved A", false, false)], false),
          similar(2, "Question B here", [cand("q-b", "Saved B", false, false)], false),
        ]),
        call("c2", [{ question: "Question A here", notSameAs: ["q-a"] }], [
          { index: 1, question: "Question A here", status: "saved", tags: [], droppedTags: [], saved: true },
        ]),
        thought,
      ])];
      render(<AgentChatMessages />);
      const note = waiting()!;
      expect(note).not.toHaveTextContent("Question A here");
      expect(note).toHaveTextContent("Question B here");
    });

    it("updates a shared target once another input adds its answer", () => {
      const saved = "How do you handle a failing deploy?";
      chat.messages = [assistant([
        call("c1", [
          { question: DEPLOY, answer: "Roll back first." },
          { question: "How do you handle a broken deploy?", answer: "Check the logs." },
        ], [
          similar(1, DEPLOY, [cand("q-1", saved, false, false)], true),
          similar(2, "How do you handle a broken deploy?", [cand("q-1", saved, false, false)], true),
        ]),
        call("c2", [{ question: DEPLOY, answer: "Roll back first.", mergeInto: { questionId: "q-1", mode: "append" } }], [
          { index: 1, question: DEPLOY, status: "merged", mode: "append", savedQuestion: saved, hadAnswer: false, tags: [], droppedTags: [], saved: true },
        ]),
        thought,
      ])];
      render(<AgentChatMessages />);
      const note = waiting()!;
      expect(note).not.toHaveTextContent(DEPLOY);
      expect(note).toHaveTextContent("How do you handle a broken deploy?");
      expect(note).toHaveTextContent("add your answer to the saved question");
      expect(note).not.toHaveTextContent("first answer");
      expect(note).toHaveTextContent(/save as new/i);
      expect(note).toHaveTextContent(/skip/i);
    });

    it("claims nothing when a re-call cannot be attributed", () => {
      chat.messages = [assistant([
        call("c1", [{ question: "Question A here" }, { question: "Question B here" }], [
          similar(1, "Question A here", [cand("q-1", "Saved one", true, false)], true),
          similar(2, "Question B here", [cand("q-1", "Saved one", true, false)], true),
        ]),
        call("c2", [{ question: "A reworded question", answer: "Some answer.", mergeInto: { questionId: "q-1", mode: "append" } }], [
          { index: 1, question: "A reworded question", status: "merged", mode: "append", savedQuestion: "Saved one", hadAnswer: true, tags: [], droppedTags: [], saved: true },
        ]),
        thought,
      ])];
      render(<AgentChatMessages />);
      expect(waiting()).not.toBeInTheDocument();
    });

    it("invites a reply without inventing choices for a historical result", () => {
      chat.messages = [assistant([
        call("c1", [{ question: DEPLOY, answer: "Roll back first." }], [
          similar(1, DEPLOY, [cand("q-1", "How do you handle a failing deploy?", true)]),
        ]),
        thought,
      ])];
      render(<AgentChatMessages />);
      const note = waiting()!;
      expect(note).toHaveTextContent(DEPLOY);
      expect(note).toHaveTextContent(/tell me what you'd like to do/i);
      expect(note).not.toHaveTextContent("replace");
    });

    const heldTurn = (extra: any[] = []) => assistant([
      call("c1", [{ question: DEPLOY }], [similar(1, DEPLOY, [cand("q-1", "Saved", false, false)], false)]),
      thought,
      ...extra,
    ]);

    it("stays out of the way when visible text follows the tool", () => {
      chat.messages = [heldTurn([{ type: "text", text: "It looks like a saved question. Save as new or skip?" }])];
      render(<AgentChatMessages />);
      expect(waiting()).not.toBeInTheDocument();
    });

    it.each(["streaming", "submitted", "error"])("stays out of the way while status is %s", (status) => {
      chat.messages = [heldTurn()];
      chat.status = status;
      render(<AgentChatMessages />);
      expect(waiting()).not.toBeInTheDocument();
    });

    it("stays out of the way on an interrupted or stopped turn", () => {
      chat.messages = [heldTurn()];
      chat.interruptedTurn = true;
      const { unmount } = render(<AgentChatMessages />);
      expect(waiting()).not.toBeInTheDocument();
      unmount();
      chat.interruptedTurn = false;
      chat.stoppedReplies = new Map([["a1", "Stopped"]]);
      render(<AgentChatMessages />);
      expect(waiting()).not.toBeInTheDocument();
    });

    it("stays out of the way once everything settled", () => {
      chat.messages = [assistant([
        call("c1", [{ question: DEPLOY }], [{ index: 1, question: DEPLOY, status: "saved", tags: [], droppedTags: [], saved: true }]),
        thought,
      ])];
      render(<AgentChatMessages />);
      expect(waiting()).not.toBeInTheDocument();
    });

    it("only follows the latest assistant turn", () => {
      chat.messages = [heldTurn(), user([{ type: "text", text: "never mind" }]), { ...assistant([{ type: "text", text: "OK." }]), id: "a2" }];
      render(<AgentChatMessages />);
      expect(waiting()).not.toBeInTheDocument();
    });
  });
});

