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

import { AgentChatProvider } from "@/components/agent/AgentChatProvider";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { AgentChatTrigger } from "@/components/AgentChatTrigger";
import { RightRailProvider, useRightRail } from "@/context/RightRailContext";

function OtherPanel() {
  const { requestOpen } = useRightRail();
  return <button onClick={() => requestOpen("review")}>open review</button>;
}

const setup = (initialMessages: any[] = []) =>
  render(
    <RightRailProvider>
      <AgentChatProvider initialMessages={initialMessages}>
        <AgentChatTrigger />
        <OtherPanel />
        <AgentChatPanel />
      </AgentChatProvider>
    </RightRailProvider>,
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
    ).toBe("AI Agent");
  });
});
