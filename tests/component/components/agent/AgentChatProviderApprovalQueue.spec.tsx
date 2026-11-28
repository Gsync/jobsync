import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Real useChat, stubbed fetch: the bug is a race inside the AI SDK.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/dashboard/myjobs",
}));
vi.mock("@/actions/agentChat.actions", () => ({
  clearChatConversation: vi.fn(async () => ({ success: true })),
  saveChatConversation: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: vi.fn(async () => ({ success: true, data: { settings: {} } })),
}));
vi.mock("@/utils/ai.utils", () => ({
  checkLocalProviderConnection: vi.fn(async () => ({ isConnected: true })),
}));

import { AgentChatProvider, useAgentChat } from "@/components/agent/AgentChatProvider";
import { RightRailProvider } from "@/context/RightRailContext";
import { SidebarProvider } from "@/context/SidebarContext";

const sse = (chunks: object[]) =>
  new Response(
    chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n",
    { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } },
  );

const denied = [{ type: "tool-output-denied", toolCallId: "c1" }, { type: "finish", finishReason: "stop" }];
const reply = [
  { type: "start" },
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: "ok" },
  { type: "text-end", id: "t1" },
  { type: "finish", finishReason: "stop" },
];

const pendingCard = {
  id: "a1",
  role: "assistant",
  parts: [
    { type: "step-start" },
    {
      type: "tool-add_job",
      toolCallId: "c1",
      state: "approval-requested",
      input: { company: "Acme" },
      approval: { id: "ap1" },
    },
  ],
};

function Probe() {
  const c = useAgentChat();
  return (
    <div>
      <button onClick={() => void c.sendMessage({ parts: [{ type: "text", text: "Remote" }] } as any)}>
        queue
      </button>
      <button onClick={() => void c.addToolApprovalResponse({ id: "ap1", approved: false })}>skip</button>
      <span data-testid="queued">{c.queued ? "queued" : ""}</span>
      <span data-testid="card">
        {(c.messages.flatMap((m) => m.parts).find((p: any) => p.toolCallId === "c1") as any)?.state}
      </span>
    </div>
  );
}

describe("AgentChatProvider queued message behind an approval", () => {
  let bodies: any[];

  beforeEach(() => {
    bodies = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        bodies.push(body);
        return sse(body.messages.at(-1).role === "assistant" ? denied : reply);
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts the Cancel before releasing the queued message", async () => {
    render(
      <SidebarProvider initialExpanded>
        <RightRailProvider>
          <AgentChatProvider initialMessages={[{ id: "u0", role: "user", parts: [{ type: "text", text: "add" }] }, pendingCard] as any}>
            <Probe />
          </AgentChatProvider>
        </RightRailProvider>
      </SidebarProvider>,
    );
    await userEvent.click(screen.getByText("queue"));
    expect(screen.getByTestId("queued").textContent).toBe("queued");

    await userEvent.click(screen.getByText("skip"));
    await waitFor(() => expect(bodies).toHaveLength(2));
    await waitFor(() => expect(screen.getByTestId("card").textContent).toBe("output-denied"));

    expect(bodies.map((b) => b.messages.at(-1).role)).toEqual(["assistant", "user"]);
  });
});
