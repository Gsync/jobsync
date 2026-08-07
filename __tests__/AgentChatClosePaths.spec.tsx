import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const chat = {
  messages: [] as any[],
  status: "ready" as string,
  error: undefined as Error | undefined,
  sendMessage: vi.fn(),
  stop: vi.fn(),
  regenerate: vi.fn(),
  clearError: vi.fn(),
  addToolApprovalResponse: vi.fn(),
  setMessages: vi.fn(),
};
vi.mock("@ai-sdk/react", () => ({
  useChat: () => chat,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/dashboard/myjobs",
}));

vi.mock("@/actions/agentChat.actions", () => ({
  clearChatConversation: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: vi.fn(async () => ({
    success: true,
    data: { settings: { ai: { provider: "ollama", model: "qwen3.5:9b" } } },
  })),
}));
vi.mock("@/utils/ai.utils", () => ({
  checkOllamaConnection: vi.fn(async () => ({ isConnected: true })),
}));
vi.mock("@/lib/toast", () => ({ toastInfo: vi.fn() }));

import { AgentChatProvider } from "@/components/agent/AgentChatProvider";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { AgentChatTrigger } from "@/components/AgentChatTrigger";
import { RightRailProvider, useRightRail } from "@/context/RightRailContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { toastInfo } from "@/lib/toast";

function OtherPanel() {
  const { requestOpen } = useRightRail();
  return <button onClick={() => requestOpen("review")}>open review</button>;
}

const setup = (initialMessages: any[] = []) =>
  render(
    <SidebarProvider initialExpanded>
      <RightRailProvider>
        <AgentChatProvider initialMessages={initialMessages}>
          <AgentChatTrigger />
          <OtherPanel />
          <AgentChatPanel />
        </AgentChatProvider>
      </RightRailProvider>
    </SidebarProvider>,
  );

const openPanel = async () => {
  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: /open assistant/i }));
  });
};

const approvalMessage = {
  id: "a1",
  role: "assistant",
  parts: [
    {
      type: "tool-add_job",
      toolCallId: "c1",
      state: "approval-requested",
      input: { company: "Acme" },
      approval: { id: "ap1" },
    },
  ],
};

const reviewRunningMessage = {
  id: "a1",
  role: "assistant",
  parts: [
    {
      type: "tool-review_resume",
      toolCallId: "rv1",
      state: "input-available",
      input: {},
    },
  ],
};

describe("agent chat close paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.messages = [];
    chat.status = "streaming";
    chat.error = undefined;
  });

  it("stops the stream when the panel's close button is used", async () => {
    setup();
    await openPanel();
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Close chat" }));
    });
    expect(chat.stop).toHaveBeenCalled();
  });

  it("stops the stream on Escape", async () => {
    setup();
    await openPanel();
    await act(async () => {
      await userEvent.keyboard("{Escape}");
    });
    expect(chat.stop).toHaveBeenCalled();
  });

  it("stops the stream when another panel takes the right rail", async () => {
    setup();
    await openPanel();
    await act(async () => {
      await userEvent.click(screen.getByText("open review"));
    });
    expect(chat.stop).toHaveBeenCalled();
  });

  it("stops the stream when the Header trigger toggles it shut", async () => {
    setup();
    await openPanel();
    await act(async () => {
      await userEvent.click(
        screen.getByRole("button", { name: /close assistant/i }),
      );
    });
    expect(chat.stop).toHaveBeenCalled();
  });

  it("flags a pending approval on the trigger", () => {
    chat.messages = [approvalMessage];
    setup([approvalMessage]);
    expect(screen.getByLabelText("Approval pending")).toBeInTheDocument();
  });

  it("never advertises streaming on the trigger — nothing runs while closed", () => {
    chat.status = "streaming";
    setup();
    expect(screen.queryByLabelText("Approval pending")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open assistant/i }).textContent,
    ).toBe("Chat AI");
  });

  // Closing is the only abort with no on-screen trace: the panel that would
  // have shown it is gone, and interruptedTurn only surfaces on reopen.
  it("toasts when closing aborts a stream", async () => {
    setup();
    await openPanel();
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Close chat" }));
    });
    expect(vi.mocked(toastInfo).mock.calls[0]![0]).toMatch(/stopped/i);
  });

  it("toasts when Clear aborts a stream", async () => {
    setup();
    await openPanel();
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    });
    expect(vi.mocked(toastInfo).mock.calls[0]![0]).toMatch(/cleared/i);
  });

  // Both toasts are gated on an actual abort — closing or clearing an idle
  // panel interrupted nothing and must stay silent.
  it("stays silent when nothing was streaming", async () => {
    chat.status = "ready";
    setup();
    await openPanel();
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Clear" }));
      await userEvent.click(screen.getByRole("button", { name: "Close chat" }));
    });
    expect(toastInfo).not.toHaveBeenCalled();
  });

  // The nested generation is inside the outer streamText's tool call, so the
  // same abort covers it — nothing keeps reviewing while the panel is shut.
  it("stops a running nested review when the panel closes", async () => {
    chat.messages = [reviewRunningMessage];
    chat.status = "streaming";
    setup([reviewRunningMessage]);
    await openPanel();
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Close chat" }));
    });
    expect(chat.stop).toHaveBeenCalled();
  });
});
