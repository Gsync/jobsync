import { asSchema, type ToolSet } from "ai";
import { numCtxFor } from "@/lib/ai/numCtx";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/ai/chat/route";
import { AGENT_PASTE_PART_TYPE } from "@/models/agent.model";

vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/ai/rate-limiter", () => ({ checkRateLimit: () => ({ allowed: true }) }));
vi.mock("@/lib/ai/providers", () => ({ getModel: async () => ({ id: "fake-model" }) }));
vi.mock("@/lib/ai/aiConfig", () => ({
  resolveAiConfig: async () => ({
    ok: true,
    config: { provider: "ollama", modelName: "qwen3.5:9b", numCtx: numCtxFor("chat") },
  }),
}));
vi.mock("@/actions/agentChat.actions", () => ({
  saveChatConversation: async () => ({ success: true }),
}));
vi.mock("@/lib/aiUsage/tracker", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/aiUsage/tracker")>(),
  startAiCall: () => ({ markFirstToken: vi.fn(), finish: vi.fn() }),
}));
vi.mock("@/lib/agent/memory/paste.server", async (importOriginal) => {
  const { truncateForModel } = await importOriginal<typeof import("@/lib/agent/memory/paste.server")>();
  return { truncateForModel: (text: string) => truncateForModel(text, "CHARACTERIZE0001") };
});

type TurnArgs = {
  instructions: string;
  tools: ToolSet;
  messages: unknown[];
  temperature?: number;
  providerOptions: unknown;
  toolApproval?: Record<string, unknown>;
  stopWhen: unknown[];
};

const streamText = vi.fn((_args: TurnArgs) => ({ stream: new ReadableStream() }));
vi.mock("ai", async (importOriginal) => ({
  ...await importOriginal<typeof import("ai")>(),
  streamText: (args: TurnArgs) => streamText(args),
  toUIMessageStream: () => new ReadableStream({ start: (controller) => controller.close() }),
}));

function capture(args: TurnArgs) {
  return {
    instructions: args.instructions,
    tools: Object.entries(args.tools).map(([name, tool]) => ({
      name, description: tool.description, inputSchema: asSchema(tool.inputSchema).jsonSchema,
    })),
    messages: args.messages,
    temperature: args.temperature,
    providerOptions: args.providerOptions,
    toolApprovalKeys: Object.keys(args.toolApproval ?? {}),
    stopWhenCount: args.stopWhen.length,
  };
}

const user = (id: string, text: string) => ({ id, role: "user", parts: [{ type: "text", text }] });
const posting = "Senior TypeScript engineer needed. ".repeat(74).slice(0, 2500);
const paste = {
  id: "u1", role: "user",
  parts: [
    { type: "text", text: "add this job" },
    { type: AGENT_PASTE_PART_TYPE, id: "p1", data: { id: "p1", text: posting, chars: posting.length, truncated: false } },
  ],
};
const jobsPage = { route: "/dashboard/myjobs" };
const approvalTurn = (approval: { id: string; approved: boolean; reason?: string }) => ({
  pageContext: jobsPage,
  messages: [paste, {
    id: "a1", role: "assistant",
    parts: [{
      type: "tool-add_job", toolCallId: "c1", state: "approval-responded",
      input: { company: "Acme", jobTitle: "Engineer" }, approval,
    }],
  }],
});
const resumeText = "Skills: TypeScript, SQL.";
const turns = {
  plain: {
    pageContext: { route: "/dashboard/myjobs/job-1", jobId: "job-1" },
    messages: [user("u1", "How well do I match this job?")],
  },
  paste: { pageContext: jobsPage, messages: [paste] },
  "tool-history": {
    pageContext: { route: "/dashboard/profile/resume/r1", resumeId: "r1" },
    messages: [
      user("u1", "What skills are on my resume?"),
      {
        id: "a1", role: "assistant",
        parts: [
          { type: "reasoning", text: "Read the open resume." },
          {
            type: "tool-get_resume", toolCallId: "c1", state: "output-available", input: {},
            output: { status: "ok", resumeId: "r1", title: "Engineer", resumeText, chars: resumeText.length, truncated: false, source: "page" },
          },
          { type: "text", text: "Your resume lists TypeScript and SQL." },
        ],
      },
      user("u2", "Which of those are strongest?"),
    ],
  },
  "approval-resume": approvalTurn({ id: "ap1", approved: true }),
  "approval-denied": approvalTurn({ id: "ap1", approved: false, reason: "Wrong company" }),
};

describe("model input for a chat turn", () => {
  it.each(Object.entries(turns))("%s", async (name, body) => {
    const response = await POST(new NextRequest("http://localhost/api/ai/chat", {
      method: "POST", body: JSON.stringify(body),
    }));
    expect(response.status).toBe(200);
    expect(streamText).toHaveBeenCalledTimes(1);
    const turn = capture(streamText.mock.calls[0]![0]);
    if (name === "approval-resume" || name === "approval-denied") {
      const messages = JSON.stringify(turn.messages);
      expect(messages).not.toContain("<page-context>");
      expect(messages).not.toContain("<<<PASTED_");
    }
    await expect(JSON.stringify(turn, null, 2)).toMatchFileSnapshot(`./fixtures/chat-turn.${name}.json`);
  });
});
