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
  dismissInterrupted: vi.fn(),
};
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => chat,
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
    expect(screen.getByText("![x](http://evil/a.png)")).toBeInTheDocument();
  });
});
