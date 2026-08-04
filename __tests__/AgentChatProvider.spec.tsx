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
vi.mock("@/actions/profile.actions", () => ({
  saveResumeReviewResult: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/toast", () => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));

import {
  AgentChatProvider,
  pageContextFor,
  useAgentChat,
} from "@/components/agent/AgentChatProvider";
import { RightRailProvider, useRightRail } from "@/context/RightRailContext";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { clearChatConversation } from "@/actions/agentChat.actions";
import { getUserSettings } from "@/actions/userSettings.actions";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { saveResumeReviewResult } from "@/actions/profile.actions";

function Probe() {
  const c = useAgentChat();
  const { holder } = useRightRail();
  const { expanded } = useSidebar();
  return (
    <div>
      <button onClick={c.open}>open</button>
      <button onClick={c.close}>close</button>
      <button onClick={c.clear}>clear</button>
      <span data-testid="sidebar">{String(expanded)}</span>
      <span data-testid="state">{`${c.isOpen}|${c.approvalPending}|${c.interruptedTurn}|${holder}|${c.preflight.ok}`}</span>
      <span data-testid="composer-nonce">{c.composerNonce}</span>
    </div>
  );
}

const setup = (initialMessages: any[] = []) =>
  render(
    <SidebarProvider initialExpanded>
      <RightRailProvider>
        <AgentChatProvider initialMessages={initialMessages}>
          <Probe />
        </AgentChatProvider>
      </RightRailProvider>
    </SidebarProvider>,
  );

const reviewMessage = {
  id: "a2",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "SCORES: overall=78 impact=72 clarity=81 ats=69\n\n## Summary\n\nSolid.",
    },
  ],
} as any;

const readMessage = {
  id: "a1",
  role: "assistant",
  parts: [
    {
      type: "tool-get_resume",
      toolCallId: "t1",
      state: "output-available",
      input: {},
      output: {
        status: "ok",
        resumeId: "r1",
        title: "Senior Engineer Resume",
        resumeText: "TXT",
        chars: 3,
        truncated: false,
        source: "default",
      },
    },
  ],
} as any;

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

  it("collapses the sidebar on open and leaves it collapsed on close", async () => {
    setup();
    expect(screen.getByTestId("sidebar").textContent).toBe("true");
    await userEvent.click(screen.getByText("open"));
    expect(screen.getByTestId("sidebar").textContent).toBe("false");
    await userEvent.click(screen.getByText("close"));
    expect(screen.getByTestId("sidebar").textContent).toBe("false");
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

  it("puts the page context in the request body", () => {
    render(
      <SidebarProvider initialExpanded>
        <RightRailProvider>
          <AgentChatProvider initialMessages={[]}>
            <Probe />
          </AgentChatProvider>
        </RightRailProvider>
      </SidebarProvider>,
    );
    // prepareSendMessagesRequest is `protected` on HttpChatTransport: it is
    // there at runtime and only tsc objects. Cast rather than drop the test —
    // this is what proves the derived resumeId reaches the server, as opposed
    // to pageContextFor, which proves only the regex.
    const transport = chatInit().transport as any;
    const { body } = transport.prepareSendMessagesRequest({ messages: [] });
    expect(body.pageContext).toEqual({ route: "/dashboard/myjobs" });
  });

  it("saves a completed review to the resume it read", async () => {
    setup();
    await act(async () => {
      chatInit().onFinish({
        message: reviewMessage,
        messages: [readMessage, reviewMessage],
      });
    });
    expect(saveResumeReviewResult).toHaveBeenCalledTimes(1);
    const [resumeId, payload] = (saveResumeReviewResult as any).mock.calls[0];
    expect(resumeId).toBe("r1");
    expect(JSON.parse(payload)).toMatchObject({
      overall: 78,
      atsCompatibility: 69,
    });
    expect(JSON.parse(payload).body).toContain("## Summary");
  });

  it("does not save a reply with no scores line", async () => {
    setup();
    const chatter = {
      id: "a2",
      role: "assistant",
      parts: [{ type: "text", text: "The tables hurt your ATS score." }],
    } as any;
    await act(async () => {
      chatInit().onFinish({ message: chatter, messages: [readMessage, chatter] });
    });
    expect(saveResumeReviewResult).not.toHaveBeenCalled();
  });

  // Closing the panel mid-stream aborts, and onFinish still fires with what
  // streamed. Since the SCORES line comes first, that partial parses — and
  // saving it would overwrite a complete review with no way back.
  it("does not save a review the user aborted mid-stream", async () => {
    setup();
    await act(async () => {
      chatInit().onFinish({
        message: reviewMessage,
        messages: [readMessage, reviewMessage],
        isAbort: true,
      });
    });
    expect(saveResumeReviewResult).not.toHaveBeenCalled();
  });
});

describe("pageContextFor", () => {
  it("extracts the resume id from a resume detail route", () => {
    expect(pageContextFor("/dashboard/profile/resume/abc-123")).toEqual({
      route: "/dashboard/profile/resume/abc-123",
      resumeId: "abc-123",
    });
  });

  it("omits resumeId everywhere else", () => {
    expect(pageContextFor("/dashboard/myjobs")).toEqual({
      route: "/dashboard/myjobs",
    });
    expect(pageContextFor("/dashboard/profile/resume")).toEqual({
      route: "/dashboard/profile/resume",
    });
  });
});
