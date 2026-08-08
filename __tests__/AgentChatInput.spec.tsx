import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APP_CONSTANTS } from "@/lib/constants";
import { AGENT_PASTE_PART_TYPE } from "@/models/agent.model";

const chat = {
  sendMessage: vi.fn(),
  stop: vi.fn(),
  status: "ready" as string,
  approvalPending: false,
  queued: undefined as any,
  clearQueued: vi.fn(),
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
    chat.queued = undefined;
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

  // Browsers gate crypto.randomUUID behind a secure context, so it is absent
  // over plain http on a LAN host. Node's global crypto is not gated, which is
  // why every other test here passes while the browser drops the paste.
  it("chips an over-threshold paste where crypto.randomUUID is unavailable", async () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });
    try {
      render(<AgentChatInput />);
      await paste(long);
      expect(screen.getByText(/pasted/i)).toBeInTheDocument();
    } finally {
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: original,
      });
    }
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

  // Whether a send waits — for an approval, or for a reply already streaming —
  // is the provider's call, because it is the only place that sees all five
  // senders. A composer that second-guesses it disagrees with the resume
  // page's Review button. Holding is covered in AgentChatProvider.spec.
  it("delegates every send to the provider, approval pending or not", async () => {
    chat.approvalPending = true;
    render(<AgentChatInput />);
    await userEvent.type(screen.getByRole("textbox"), "the company is wrong");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(chat.sendMessage).toHaveBeenCalledTimes(1);
    expect(chat.sendMessage.mock.calls[0][0].parts[0].text).toBe(
      "the company is wrong",
    );
  });

  it("shows a held message and says what it is waiting for", () => {
    chat.queued = { parts: [{ type: "text", text: "the company is wrong" }] };
    const { rerender } = render(<AgentChatInput />);
    expect(screen.getByText(/current reply finishes/i)).toBeInTheDocument();
    expect(screen.getByText(/the company is wrong/)).toBeInTheDocument();
    chat.approvalPending = true;
    rerender(<AgentChatInput />);
    expect(screen.getByText(/waiting on your approval/i)).toBeInTheDocument();
  });

  it("labels a held paste-only message with its chip", () => {
    chat.queued = {
      parts: [
        {
          type: AGENT_PASTE_PART_TYPE,
          id: "p1",
          data: { id: "p1", text: "x", chars: 1234, truncated: false },
        },
      ],
    };
    render(<AgentChatInput />);
    expect(screen.getByText(/pasted posting · 1,234 chars/i)).toBeInTheDocument();
  });

  it("hands the discard back to the provider", async () => {
    chat.queued = { parts: [{ type: "text", text: "never mind" }] };
    render(<AgentChatInput />);
    await userEvent.click(
      screen.getByRole("button", { name: /remove from queue/i }),
    );
    expect(chat.clearQueued).toHaveBeenCalled();
  });

  it("empties the composer when the conversation is cleared", async () => {
    const { rerender } = render(<AgentChatInput />);
    await paste(long);
    await userEvent.type(screen.getByRole("textbox"), "never mind");
    chat.composerNonce = 1;
    rerender(<AgentChatInput />);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByText(/pasted/i)).not.toBeInTheDocument();
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
