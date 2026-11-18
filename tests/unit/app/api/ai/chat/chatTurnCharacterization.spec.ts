import { asSchema, type ToolSet } from "ai";
import { numCtxFor } from "@/lib/ai/numCtx";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/ai/chat/route";
import { AGENT_PASTE_PART_TYPE } from "@/models/agent.model";

const { save, startUsage, createJob, resolveResume } = vi.hoisted(() => ({
  resolveResume: vi.fn(async () => ({ status: "no_resumes" })),
  save: vi.fn(), startUsage: vi.fn(() => ({ markFirstToken: vi.fn(), finish: vi.fn() })), createJob: vi.fn(),
}));
vi.mock("@/lib/jobs/createJobFromNames", () => ({ createJobFromNames: createJob }));
vi.mock("@/lib/agent/steps/resumeLookup", () => ({
  resolveResumeForAgent: resolveResume,
}));
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
  saveChatConversation: save,
}));
vi.mock("@/lib/aiUsage/tracker", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/aiUsage/tracker")>(),
  startAiCall: startUsage,
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
    if (name === "approval-denied") {
      const messages = JSON.stringify(turn.messages);
      expect(messages).not.toContain("<page-context>");
      expect(messages).not.toContain("<<<PASTED_");
    }
    await expect(JSON.stringify(turn, null, 2)).toMatchFileSnapshot(`./fixtures/chat-turn.${name}.json`);
  });
});

async function postTurn(body: unknown) {
  const response = await POST(new NextRequest("http://localhost/api/ai/chat", {
    method: "POST", body: JSON.stringify(body),
  }));
  expect(response.status).toBe(200);
  return response.text();
}

it.each([true, false])("finishes the confirmed write directly (created=%s)", async (created) => {
  createJob.mockResolvedValue({ created, resolutions: [], jobId: "j1" });
  const stream = await postTurn(approvalTurn({ id: "ap1", approved: true }));
  expect(createJob).toHaveBeenCalledTimes(1);
  expect(streamText).not.toHaveBeenCalled();
  expect(startUsage).not.toHaveBeenCalled();
  expect(stream).toContain('"type":"tool-output-available"');
  expect(save.mock.lastCall?.[0][1]).toMatchObject({
    id: "a1", parts: [{ toolCallId: "c1", state: "output-available", output: { created } }],
  });
});

it("continues after validation with the executed result in the final tool message", async () => {
  createJob.mockRejectedValue(new Error("write failed"));
  await postTurn(approvalTurn({ id: "ap1", approved: true }));
  expect(createJob).toHaveBeenCalledTimes(1);
  expect(streamText).toHaveBeenCalledTimes(1);
  const messages = streamText.mock.calls[0]![0].messages;
  await expect(JSON.stringify(messages, null, 2)).toMatchFileSnapshot("./fixtures/chat-turn.validation-retry.json");
});

it.each(["review_resume", "match_job", "generate_cover_letter"])("streams the %s picker call directly", async (toolName) => {
  const stream = await postTurn({ messages: [{ id: "pick", role: "user", parts: [
    { type: "text", text: "Use Engineering" },
    { type: "data-direct-invoke", data: { toolName, input: { resumeTitle: "Engineering" } } },
  ] }] });
  expect(streamText).not.toHaveBeenCalled();
  expect(startUsage).not.toHaveBeenCalled();
  expect(stream).toContain('"type":"tool-input-available"');
  expect(stream).toContain('"type":"tool-output-available"');
  expect(save.mock.lastCall?.[0][1].parts).toContainEqual(expect.objectContaining({
    type: `tool-${toolName}`, state: "output-available", input: { resumeTitle: "Engineering" },
  }));
});

it.each([["add_job", {}], ["get_resume", {}], ["constructor", {}], ["review_resume", { resumeTitle: 7 }]])(
  "routes an ineligible picker request through chat (%s)", async (toolName, input) => {
    await postTurn({ messages: [{ id: "pick", role: "user", parts: [
      { type: "text", text: "Use Engineering" }, { type: "data-direct-invoke", data: { toolName, input } },
    ] }] });
    expect(createJob).not.toHaveBeenCalled();
    expect(streamText).toHaveBeenCalledTimes(1);
  },
);

it("leaves an approval whose schema input differs from the confirmed action to the SDK", async () => {
  const approval = { id: "ap1", approved: true, inputSchemaInput: { company: "Other", jobTitle: "Engineer" } };
  await postTurn(approvalTurn(approval));
  expect(createJob).not.toHaveBeenCalled();
  expect(streamText).toHaveBeenCalledTimes(1);
});

it("settles the running picker card when a lookup throws", async () => {
  resolveResume.mockRejectedValueOnce(new Error("internal lookup detail"));
  const stream = await postTurn({ messages: [{ id: "u1", role: "user", parts: [
    { type: "text", text: "Review Engineering" },
    { type: "data-direct-invoke", data: { toolName: "review_resume", input: { resumeTitle: "Engineering" } } },
  ] }] });
  expect(stream).not.toContain("internal lookup detail");
  expect(save.mock.lastCall?.[0][1].parts).toContainEqual(expect.objectContaining({
    type: "tool-review_resume", state: "output-error",
  }));
  expect(streamText).not.toHaveBeenCalled();
});
