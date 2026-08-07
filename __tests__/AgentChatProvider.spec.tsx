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
let currentPathname = "/dashboard/myjobs";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => currentPathname,
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
  pageContextFor,
  useAgentChat,
} from "@/components/agent/AgentChatProvider";
import { RightRailProvider, useRightRail } from "@/context/RightRailContext";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { clearChatConversation } from "@/actions/agentChat.actions";
import { getUserSettings } from "@/actions/userSettings.actions";
import { checkOllamaConnection } from "@/utils/ai.utils";

function Probe() {
  const c = useAgentChat();
  const { holder } = useRightRail();
  const { expanded, toggle } = useSidebar();
  return (
    <div>
      <button onClick={c.open}>open</button>
      <button onClick={c.close}>close</button>
      <button onClick={c.clear}>clear</button>
      <button onClick={() => void c.regenerate()}>regenerate</button>
      <button onClick={() => void c.sendMessage({ parts: [] } as any)}>
        sendMessage
      </button>
      <button onClick={c.togglePanelExpand}>togglePanelExpand</button>
      <button onClick={toggle}>toggleSidebar</button>
      <span data-testid="sidebar">{String(expanded)}</span>
      <span data-testid="state">{`${c.isOpen}|${c.approvalPending}|${c.interruptedTurn}|${holder}|${c.preflight.ok}`}</span>
      <span data-testid="composer-nonce">{c.composerNonce}</span>
      <span data-testid="panel-expanded">{String(c.isPanelExpanded)}</span>
      <span data-testid="review-stream">{c.reviewStreams["rv1"] ?? ""}</span>
    </div>
  );
}

const tree = (initialMessages: any[] = []) => (
  <SidebarProvider initialExpanded>
    <RightRailProvider>
      <AgentChatProvider initialMessages={initialMessages}>
        <Probe />
      </AgentChatProvider>
    </RightRailProvider>
  </SidebarProvider>
);

const setup = (initialMessages: any[] = []) => render(tree(initialMessages));

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
    currentPathname = "/dashboard/myjobs";
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

  // The interrupted notice describes a turn that is no longer interrupted the
  // moment the user resumes it, so it must not outlive the reply it asked for.
  it("clears the interrupted flag when the turn is resumed with Continue", async () => {
    chat.status = "streaming";
    setup();
    await userEvent.click(screen.getByText("open"));
    await userEvent.click(screen.getByText("close"));
    expect(screen.getByTestId("state").textContent).toContain("|true|");

    await userEvent.click(screen.getByText("regenerate"));
    expect(chat.regenerate).toHaveBeenCalled();
    expect(screen.getByTestId("state").textContent).toContain(
      "false|false|false|null",
    );
  });

  it("clears the interrupted flag when the user sends a new message instead", async () => {
    chat.status = "streaming";
    setup();
    await userEvent.click(screen.getByText("open"));
    await userEvent.click(screen.getByText("close"));
    expect(screen.getByTestId("state").textContent).toContain("|true|");

    await userEvent.click(screen.getByText("sendMessage"));
    expect(chat.sendMessage).toHaveBeenCalled();
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

  const reviewToolMessage = {
    id: "a2",
    role: "assistant",
    parts: [
      {
        type: "tool-review_resume",
        toolCallId: "rv1",
        state: "output-available",
        input: {},
        output: {
          status: "ok",
          resumeId: "r1",
          title: "Senior Engineer Resume",
          scores: { overall: 78, impact: 72, clarity: 81, atsCompatibility: 69 },
          body: "## Summary",
          saved: true,
        },
      },
    ],
  } as any;

  // The save lives in review_resume's execute now: it holds the resumeId and
  // the finished text, so nothing client-side has to infer either. What is
  // left here is the refresh, so a stale saved-review card behind the panel
  // does not survive a review the user just watched land.
  it("refreshes the page after a completed review", async () => {
    setup();
    await act(async () => {
      chatInit().onFinish({
        message: reviewToolMessage,
        messages: [reviewToolMessage],
      });
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("accumulates transient review deltas keyed by tool call id", async () => {
    setup();
    await act(async () => {
      chatInit().onData({ type: "data-review", id: "rv1", data: { delta: "SCO" } });
      chatInit().onData({ type: "data-review", id: "rv1", data: { delta: "RES:" } });
      chatInit().onData({ type: "data-paste", id: "rv1", data: { delta: "nope" } });
    });
    expect(screen.getByTestId("review-stream")).toHaveTextContent("SCORES:");
  });

  it("restores an expanded panel when the sidebar re-expands", async () => {
    setup();
    await userEvent.click(screen.getByText("open"));
    await userEvent.click(screen.getByText("togglePanelExpand"));
    expect(screen.getByTestId("panel-expanded").textContent).toBe("true");
    await userEvent.click(screen.getByText("toggleSidebar"));
    expect(screen.getByTestId("panel-expanded").textContent).toBe("false");
  });

  // The docked-flush width only makes sense on the page it was expanded on;
  // navigating away (e.g. clicking Dashboard/Jobs in the sidebar) leaves the
  // sidebar collapsed, so only a pathname change can catch this case.
  it("restores an expanded panel when the page navigates to a different route", async () => {
    const { rerender } = setup();
    await userEvent.click(screen.getByText("open"));
    await userEvent.click(screen.getByText("togglePanelExpand"));
    expect(screen.getByTestId("panel-expanded").textContent).toBe("true");
    currentPathname = "/dashboard/jobs";
    rerender(tree());
    expect(screen.getByTestId("panel-expanded").textContent).toBe("false");
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
