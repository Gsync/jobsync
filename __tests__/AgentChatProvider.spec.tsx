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
const useChatSpy = vi.fn((..._args: any[]) => chat);
vi.mock("@ai-sdk/react", () => ({
  useChat: (...a: unknown[]) => useChatSpy(...(a as [])),
}));

const chatInit = (call = 0) => useChatSpy.mock.calls[call][0] as any;

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
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

import {
  AgentChatProvider,
  useAgentChat,
} from "@/components/agent/AgentChatProvider";
import { RightRailProvider, useRightRail } from "@/context/RightRailContext";
import { clearChatConversation } from "@/actions/agentChat.actions";
import { getUserSettings } from "@/actions/userSettings.actions";
import { checkOllamaConnection } from "@/utils/ai.utils";

function Probe() {
  const c = useAgentChat();
  const { holder } = useRightRail();
  return (
    <div>
      <button onClick={c.open}>open</button>
      <button onClick={c.close}>close</button>
      <button onClick={c.clear}>clear</button>
      <span data-testid="state">{`${c.isOpen}|${c.approvalPending}|${c.interruptedTurn}|${holder}|${c.preflight.ok}`}</span>
      <span data-testid="composer-nonce">{c.composerNonce}</span>
    </div>
  );
}

const setup = (initialMessages: any[] = []) =>
  render(
    <RightRailProvider>
      <AgentChatProvider initialMessages={initialMessages}>
        <Probe />
      </AgentChatProvider>
    </RightRailProvider>,
  );

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

describe("AgentChatProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.messages = [];
    chat.status = "ready";
    chat.error = undefined;
  });

  it("seeds useChat with the persisted transcript", () => {
    setup([{ id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] }]);
    expect(chatInit().messages).toHaveLength(1);
  });

  it("wires sendAutomaticallyWhen, without which an approved tool never executes", () => {
    setup();
    expect(chatInit().sendAutomaticallyWhen).toBeTypeOf("function");
  });

  it("claims the right rail on open and releases it on close", async () => {
    setup();
    await userEvent.click(screen.getByText("open"));
    expect(screen.getByTestId("state").textContent).toContain(
      "true|false|false|chat",
    );
    await userEvent.click(screen.getByText("close"));
    expect(screen.getByTestId("state").textContent).toContain(
      "false|false|false|null",
    );
  });

  it("stops the stream on close and flags the turn interrupted", async () => {
    chat.status = "streaming";
    setup();
    await userEvent.click(screen.getByText("open"));
    await userEvent.click(screen.getByText("close"));
    expect(chat.stop).toHaveBeenCalled();
    expect(screen.getByTestId("state").textContent).toContain("|true|");
  });

  it("does not flag an interrupted turn when nothing was streaming", async () => {
    setup();
    await userEvent.click(screen.getByText("open"));
    await userEvent.click(screen.getByText("close"));
    expect(screen.getByTestId("state").textContent).toContain(
      "false|false|false|null",
    );
  });

  it("reports a pending approval from a rehydrated transcript", () => {
    chat.messages = [approvalMessage];
    setup([approvalMessage]);
    expect(screen.getByTestId("state").textContent).toContain("|true|");
  });

  it("does not report a pending approval for an ordinary reply", () => {
    chat.messages = [
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "sure" }] },
    ];
    setup();
    expect(screen.getByTestId("state").textContent).toContain("|false|");
  });

  it("clears in order: stop, delete, reset", async () => {
    chat.status = "streaming";
    setup();
    await userEvent.click(screen.getByText("clear"));
    const stopOrder = chat.stop.mock.invocationCallOrder[0];
    const deleteOrder = (clearChatConversation as any).mock
      .invocationCallOrder[0];
    const resetOrder = chat.setMessages.mock.invocationCallOrder[0];
    expect(stopOrder).toBeLessThan(deleteOrder);
    expect(deleteOrder).toBeLessThan(resetOrder);
  });

  it("signals the composer to reset on clear", async () => {
    setup();
    expect(screen.getByTestId("composer-nonce").textContent).toBe("0");
    await userEvent.click(screen.getByText("clear"));
    expect(screen.getByTestId("composer-nonce").textContent).toBe("1");
  });

  it("preflights Ollama on open and reports a failure", async () => {
    (checkOllamaConnection as any).mockResolvedValue({
      isConnected: false,
      error: "Ollama is not reachable.",
    });
    setup();
    await act(async () => {
      await userEvent.click(screen.getByText("open"));
    });
    expect(screen.getByTestId("state").textContent).toMatch(/false$/);
  });

  it("fails the preflight when no model is configured, without probing Ollama", async () => {
    (getUserSettings as any).mockResolvedValue({
      success: true,
      data: { settings: { ai: { provider: "ollama", model: undefined } } },
    });
    setup();
    await act(async () => {
      await userEvent.click(screen.getByText("open"));
    });
    expect(screen.getByTestId("state").textContent).toMatch(/false$/);
    expect(checkOllamaConnection).not.toHaveBeenCalled();
  });
});
