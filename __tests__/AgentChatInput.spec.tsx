import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_PASTE_PART_TYPE } from "@/models/agent.model";

const chat = {
  sendMessage: vi.fn(),
  stop: vi.fn(),
  status: "ready" as string,
  approvalPending: false,
  error: undefined as Error | undefined,
  clearError: vi.fn(),
  preflight: { checked: true, ok: true } as any,
  composerNonce: 0,
};
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => chat,
}));

import { AgentChatInput } from "@/components/agent/AgentChatInput";

const paste = async (text: string) => {
  const box = screen.getByRole("textbox");
  box.focus();
  await userEvent.paste(text);
};

const short = "a short pasted note";
const long = "x".repeat(APP_CONSTANTS.AGENT_CHAT_PASTE_THRESHOLD + 100);
const huge = "y".repeat(APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS + 1000);

describe("AgentChatInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.status = "ready";
    chat.approvalPending = false;
    chat.error = undefined;
    chat.preflight = { checked: true, ok: true };
    chat.composerNonce = 0;
  });

  it("leaves a short paste inline in the textarea", async () => {
    render(<AgentChatInput />);
    await paste(short);
    // Not toHaveValue: jest-dom does not reliably accept asymmetric matchers.
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain(
      short,
    );
    expect(screen.queryByText(/pasted/i)).not.toBeInTheDocument();
  });

  it("turns an over-threshold paste into a removable chip", async () => {
    render(<AgentChatInput />);
    await paste(long);
    expect(screen.getByText(/pasted/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByText(/pasted/i)).not.toBeInTheDocument();
  });

  it("truncates and labels a paste above the ceiling", async () => {
    render(<AgentChatInput />);
    await paste(huge);
    expect(screen.getByText(/truncated/i)).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox"), "add this");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    const parts = chat.sendMessage.mock.calls[0][0].parts;
    const pastePart = parts.find((p: any) => p.type === AGENT_PASTE_PART_TYPE);
    expect(pastePart.data.text.length).toBe(
      APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS,
    );
    expect(pastePart.data.truncated).toBe(true);
  });

  it("sends the chip as a data part alongside the text", async () => {
    render(<AgentChatInput />);
    await paste(long);
    await userEvent.type(screen.getByRole("textbox"), "add this job");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    const parts = chat.sendMessage.mock.calls[0][0].parts;
    expect(
      parts.some((p: any) => p.type === "text" && p.text === "add this job"),
    ).toBe(true);
    expect(parts.some((p: any) => p.type === AGENT_PASTE_PART_TYPE)).toBe(true);
  });

  it("queues rather than sends while an approval is pending", async () => {
    chat.approvalPending = true;
    render(<AgentChatInput />);
    await userEvent.type(screen.getByRole("textbox"), "the company is wrong");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(chat.sendMessage).not.toHaveBeenCalled();
    expect(screen.getByText(/waiting on your approval/i)).toBeInTheDocument();
    expect(screen.getByText(/the company is wrong/)).toBeInTheDocument();
  });

  it("keeps a new paste out of messages while the card is open — the paste-drift invariant", async () => {
    chat.approvalPending = true;
    render(<AgentChatInput />);
    await paste(long);
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("dispatches the queued message once the approval resolves", async () => {
    chat.approvalPending = true;
    const { rerender } = render(<AgentChatInput />);
    await userEvent.type(screen.getByRole("textbox"), "the company is wrong");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    chat.approvalPending = false;
    rerender(<AgentChatInput />);
    expect(chat.sendMessage).toHaveBeenCalled();
    expect(chat.sendMessage.mock.calls[0][0].parts[0].text).toBe(
      "the company is wrong",
    );
  });

  it("holds the queued message while the approval's follow-up POST is streaming", async () => {
    // approvalPending clears at the same instant sendAutomaticallyWhen fires
    // the POST that executes the approved tool. Dispatching on that render
    // would race it — the queue waits for status to return to ready.
    chat.approvalPending = true;
    const { rerender } = render(<AgentChatInput />);
    await userEvent.type(screen.getByRole("textbox"), "the company is wrong");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    chat.approvalPending = false;
    chat.status = "streaming";
    rerender(<AgentChatInput />);
    expect(chat.sendMessage).not.toHaveBeenCalled();
    chat.status = "ready";
    rerender(<AgentChatInput />);
    expect(chat.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("lets the user discard a queued message", async () => {
    chat.approvalPending = true;
    render(<AgentChatInput />);
    await userEvent.type(screen.getByRole("textbox"), "never mind");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /remove from queue/i }),
    );
    chat.approvalPending = false;
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("empties the composer when the conversation is cleared", async () => {
    chat.approvalPending = true;
    const { rerender } = render(<AgentChatInput />);
    await paste(long);
    await userEvent.type(screen.getByRole("textbox"), "never mind");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    chat.composerNonce = 1;
    rerender(<AgentChatInput />);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByText(/pasted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/queued/i)).not.toBeInTheDocument();
  });

  it("swaps send for stop while streaming", async () => {
    chat.status = "streaming";
    render(<AgentChatInput />);
    await userEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(chat.stop).toHaveBeenCalled();
  });

  it("shows a dismissible error banner above the composer", async () => {
    chat.error = new Error("Cannot reach ollama.");
    render(<AgentChatInput />);
    expect(screen.getByText(/cannot reach ollama/i)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /dismiss error/i }),
    );
    expect(chat.clearError).toHaveBeenCalled();
  });

  it("disables sending entirely when the preflight failed", () => {
    chat.preflight = {
      checked: true,
      ok: false,
      error: "Ollama is not reachable.",
    };
    render(<AgentChatInput />);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });
});
