vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));
vi.mock("@/lib/ai/rate-limiter", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ getModel: vi.fn() }));
vi.mock("@/actions/userSettings.actions", () => ({ getUserSettings: vi.fn() }));
vi.mock("@/actions/agentChat.actions", () => ({ saveChatConversation: vi.fn() }));
vi.mock("@/lib/agent/tools", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agent/tools")>();
  return { ...actual, buildAgentTools: vi.fn(actual.buildAgentTools) };
});

// The route merges this into createUIMessageStream now. An immediately
// closed stream is enough — these tests assert on the streamText ARGS.
const toUIMessageStream = vi.fn(
  () =>
    new ReadableStream({
      start(controller) {
        controller.close();
      },
    }),
);
const streamText = vi.fn((..._args: any[]) => ({ toUIMessageStream }));
const streamArgs = (): any => streamText.mock.calls[0]![0];
// The turn's write-back lives in onFinish, which only fires once the stream is
// consumed. Captured here so the abort branch can be driven directly.
let capturedOnFinish: ((arg: any) => Promise<void>) | undefined;
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: (...args: unknown[]) => streamText(...(args as [])),
    createUIMessageStream: (options: any) => {
      capturedOnFinish = options.onFinish;
      return actual.createUIMessageStream(options);
    },
  };
});

import { POST } from "@/app/api/ai/chat/route";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { getModel } from "@/lib/ai/providers";
import { getUserSettings } from "@/actions/userSettings.actions";
import { saveChatConversation } from "@/actions/agentChat.actions";
import { buildAgentTools } from "@/lib/agent/tools";
import { buildPageContextMessage } from "@/lib/agent/prompt";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  AGENT_CHAT_TERMINAL_TOOLS,
  AGENT_PASTE_PART_TYPE,
} from "@/models/agent.model";
import { AGENT_PASTE_ONLY_USER_MESSAGE } from "@/lib/agent/prompt";

// signal is not optional on a real Request — the route composes the turn's
// abort signal from it so a client disconnect stops generation.
const req = (body: unknown) =>
  ({ json: async () => body, signal: new AbortController().signal }) as any;

const pasteMessage = (text: string) => ({
  id: "m1",
  role: "user",
  parts: [
    { type: "text", text: "add this job" },
    { type: AGENT_PASTE_PART_TYPE, id: "p1", data: { id: "p1", text, chars: text.length, truncated: false } },
  ],
});

describe("POST /api/ai/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (checkRateLimit as any).mockReturnValue({ allowed: true, remaining: 29, resetIn: 60000 });
    (getUserSettings as any).mockResolvedValue({
      success: true,
      data: { settings: { ai: { provider: "ollama", model: "qwen3.5:9b" } } },
    });
    (getModel as any).mockResolvedValue({ id: "fake-model" });
    (saveChatConversation as any).mockResolvedValue({ success: true });
  });

  it("returns 401 without a session", async () => {
    (auth as any).mockResolvedValue(null);
    expect((await POST(req({ messages: [] }))).status).toBe(401);
  });

  it("returns 429 using the chat bucket, not the shared one", async () => {
    (checkRateLimit as any).mockReturnValue({ allowed: false, remaining: 0, resetIn: 30000 });
    expect((await POST(req({ messages: [] }))).status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith("user-1", "chat");
  });

  it("returns 400 for a malformed body", async () => {
    expect((await POST(req({ nope: true }))).status).toBe(400);
  });

  it("returns 400, not a 500, for messages the SDK cannot convert", async () => {
    // z.array(z.any()) lets this through; convertToModelMessages rejects on
    // the unknown role (correction #5), and that is a bad request.
    const res = await POST(req({ messages: [{ id: "m1", role: "wizard", parts: [{ type: "text", text: "hi" }] }] }));
    expect(res.status).toBe(400);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 503 when the provider credential is missing", async () => {
    (getModel as any).mockRejectedValue(new Error("Ollama credential not configured"));
    const res = await POST(req({ messages: [pasteMessage("posting")] }));
    expect(res.status).toBe(503);
  });

  it("persists the incoming messages BEFORE calling the model", async () => {
    const messages = [pasteMessage("the 6kb posting")];
    await POST(req({ messages }));
    expect(saveChatConversation).toHaveBeenCalled();
    const saveOrder = (saveChatConversation as any).mock.invocationCallOrder[0];
    const streamOrder = streamText.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(streamOrder);
  });

  // Clear deletes the conversation row and the cancelled turn's onFinish fires
  // afterwards — writing there would restore exactly what was just deleted.
  it("does not write the turn back when it was cancelled", async () => {
    await POST(req({ messages: [pasteMessage("posting")] }));
    const afterReceipt = (saveChatConversation as any).mock.calls.length;

    await capturedOnFinish!({
      messages: [pasteMessage("posting")],
      responseMessage: undefined,
      isAborted: true,
    });
    expect((saveChatConversation as any).mock.calls.length).toBe(afterReceipt);
  });

  it("still writes the turn back when it finished normally", async () => {
    await POST(req({ messages: [pasteMessage("posting")] }));
    const afterReceipt = (saveChatConversation as any).mock.calls.length;

    await capturedOnFinish!({
      messages: [pasteMessage("posting")],
      responseMessage: undefined,
      isAborted: false,
    });
    expect((saveChatConversation as any).mock.calls.length).toBe(
      afterReceipt + 1,
    );
  });

  // The log line discriminates on result shape, not on a tool-name allowlist.
  // An allowlist logged get_resume as "duplicate" once; a fourth tool would
  // have re-run that bug with a successful write logged as a rejected one.
  it("logs a status-carrying result from an unrecognised tool by its status", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await POST(req({ messages: [pasteMessage("posting")] }));
    await capturedOnFinish!({
      messages: [],
      responseMessage: {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-match_job",
            toolCallId: "c1",
            state: "output-available",
            output: { status: "ok", score: 78 },
          },
        ],
      },
      isAborted: false,
    });
    const logged = info.mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(logged).toMatchObject({ tool: "match_job", outcome: "ok" });
    info.mockRestore();
  });

  it("still logs add_job's create/duplicate outcome, which carries no status", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await POST(req({ messages: [pasteMessage("posting")] }));
    await capturedOnFinish!({
      messages: [],
      responseMessage: {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-add_job",
            toolCallId: "c1",
            state: "output-available",
            output: { created: false, duplicateOf: { id: "j" } },
          },
        ],
      },
      isAborted: false,
    });
    const logged = info.mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(logged).toMatchObject({ tool: "add_job", outcome: "duplicate" });
    info.mockRestore();
  });

  // Pasting and hitting Send without typing produces a message whose only
  // part is the chip. convertToModelMessages drops that custom data part, so
  // the message converts to empty content — and ollama-ai-provider-v2
  // serializes empty user content as [], which Ollama 400s on because its
  // content field is a string. The paste context message carries the posting,
  // so the empty shell has nothing left to say.
  it("never sends a contentless message when the user pastes without typing", async () => {
    const chipOnly = {
      id: "m1",
      role: "user",
      parts: [
        { type: AGENT_PASTE_PART_TYPE, id: "p1", data: { id: "p1", text: "MARKER posting", chars: 14, truncated: false } },
      ],
    };
    await POST(req({ messages: [chipOnly] }));
    expect(streamText).toHaveBeenCalled();
    const sent = streamArgs().messages;
    const contentless = sent.filter(
      (m: any) => Array.isArray(m.content) && m.content.length === 0,
    );
    expect(contentless).toEqual([]);
    // The posting still has to reach the model, or we fixed it by muting it.
    expect(JSON.stringify(sent)).toContain("MARKER posting");
  });

  // The chip-only message is given a body rather than dropped. Dropping it
  // deleted a user turn that really happened, which moved the last-user
  // boundary back over an older assistant reply — and DeepSeek's thinking
  // mode requires reasoning_content on every assistant message after that
  // boundary, so a reasoning-free reply from two turns ago 400'd the request.
  it("keeps a chip-only user message in place so the turn boundary survives", async () => {
    const chipOnly = {
      id: "m3",
      role: "user",
      parts: [
        { type: AGENT_PASTE_PART_TYPE, id: "p1", data: { id: "p1", text: "MARKER posting", chars: 14, truncated: false } },
      ],
    };
    await POST(
      req({
        messages: [
          { id: "m1", role: "user", parts: [{ type: "text", text: "hello" }] },
          { id: "m2", role: "assistant", parts: [{ type: "text", text: "I can add jobs." }] },
          chipOnly,
        ],
      }),
    );
    const sent = streamArgs().messages;
    const roles = sent.map((m: any) => m.role);
    // No assistant may sit after the last user message.
    expect(roles.lastIndexOf("user")).toBeGreaterThan(roles.lastIndexOf("assistant"));
    expect(sent[2]).toEqual({ role: "user", content: AGENT_PASTE_ONLY_USER_MESSAGE });
  });

  it("sends only the truncated head to the model, never the full paste", async () => {
    const posting = "HEAD_MARKER " + "x".repeat(APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS) + " TAIL_MARKER";
    await POST(req({ messages: [pasteMessage(posting)] }));
    const sent = JSON.stringify(streamArgs().messages);
    expect(sent).toContain("HEAD_MARKER");
    expect(sent).not.toContain("TAIL_MARKER");
  });

  it("hands the FULL pasted text to the tool factory", async () => {
    const posting = "HEAD_MARKER " + "x".repeat(APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS) + " TAIL_MARKER";
    await POST(req({ messages: [pasteMessage(posting)] }));
    // The factory is spied (partial module mock above) so the closure's text
    // is asserted directly — with the previous test, this pins the split:
    // head to the model, full text to the tool.
    expect(buildAgentTools).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", pastedText: posting }),
    );
    expect(Object.keys(streamArgs().tools)).toEqual([
      "add_job",
      "get_resume",
      "review_resume",
      "match_job",
      "generate_cover_letter",
    ]);
  });

  it("configures the loop bounds the design specifies", async () => {
    await POST(req({ messages: [pasteMessage("posting")] }));
    const args = streamArgs();
    // stepCountIs plus one hasToolCall per terminal tool.
    expect(args.stopWhen).toHaveLength(AGENT_CHAT_TERMINAL_TOOLS.length + 1);
    expect(args.temperature).toBe(0.1);
    expect(args.abortSignal).toBeDefined();
    expect(args.providerOptions.ollama.options.num_ctx).toBe(APP_CONSTANTS.AGENT_CHAT_NUM_CTX);
    // qwen3.5 deliberates in the content channel when thinking is off, and
    // content and a tool call are mutually exclusive. Measured 1/7 vs 7/7.
    expect(args.providerOptions.ollama.think).toBe(true);
  });

  // Without this the client aborting its fetch — stop(), Clear, closing the
  // panel — was invisible to the server and generation ran to the deadline.
  it("aborts the generation when the client disconnects", async () => {
    const controller = new AbortController();
    await POST({
      json: async () => ({ messages: [pasteMessage("posting")] }),
      signal: controller.signal,
    } as any);
    const { abortSignal } = streamArgs();
    expect(abortSignal.aborted).toBe(false);
    controller.abort();
    expect(abortSignal.aborted).toBe(true);
  });

  it("returns 503 naming Settings when no model is configured, and never guesses one", async () => {
    (getUserSettings as any).mockResolvedValue({
      success: true,
      data: { settings: { ai: { provider: "ollama", model: undefined } } },
    });
    const res = await POST(req({ messages: [pasteMessage("posting")] }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/settings/i);
    expect(getModel).not.toHaveBeenCalled();
    expect(streamText).not.toHaveBeenCalled();
  });

  it("uses the configured model exactly as configured", async () => {
    await POST(req({ messages: [pasteMessage("posting")] }));
    expect(getModel).toHaveBeenCalledWith("ollama", "qwen3.5:9b", "user-1");
  });

  it("sends at most AGENT_CHAT_HISTORY_MESSAGES to the model", async () => {
    const many = Array.from({ length: APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES + 10 }, (_, i) => ({
      id: `m${i}`,
      role: "user",
      parts: [{ type: "text", text: `hello ${i}` }],
    }));
    await POST(req({ messages: many }));
    // windowMessages bounds the HISTORY. The route then injects the page line
    // on every user turn (and the paste head on a paste turn) on top of it.
    expect(streamArgs().messages.length).toBeLessThanOrEqual(
      APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES + 1,
    );
  });

  it("does not re-inject the paste head on the approval POST", async () => {
    const messages = [
      pasteMessage("HEAD_MARKER posting body"),
      {
        id: "m2",
        role: "assistant",
        parts: [{ type: "tool-add_job", toolCallId: "c1", state: "approval-responded", input: { company: "Acme", jobTitle: "Eng" }, approval: { id: "a1", approved: true } }],
      },
    ];
    await POST(req({ messages }));
    const sent = JSON.stringify(streamArgs().messages);
    expect(sent).not.toContain("<<<PASTED_");
  });

  // Defect A: the model replayed turn 1's no_job on turns 2 and 3 because
  // nothing in the later requests said the page had changed.
  it("tells the model which page the user is on, and sends no ids", async () => {
    await POST(
      req({
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "match this" }] }],
        pageContext: { route: "/dashboard/myjobs/job-9", jobId: "job-9" },
      }),
    );
    const sent = streamArgs().messages;
    expect(sent.at(-1).role).toBe("user");
    expect(sent.at(-1).content).toBe(
      buildPageContextMessage({ route: "/dashboard/myjobs/job-9", jobId: "job-9" }),
    );
    // The whole point of the fixed table: no client-supplied value travels.
    expect(JSON.stringify(sent)).not.toContain("job-9");
  });

  it("keeps the pasted posting after the page line", async () => {
    await POST(
      req({
        messages: [pasteMessage("MARKER posting")],
        pageContext: { route: "/dashboard/myjobs" },
      }),
    );
    const contents = streamArgs().messages.map((m: any) =>
      typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    );
    const pageIndex = contents.findIndex((c: string) =>
      c.includes("<page-context>"),
    );
    const pasteIndex = contents.findIndex((c: string) => c.includes("MARKER posting"));
    expect(pageIndex).toBeGreaterThan(-1);
    expect(pasteIndex).toBeGreaterThan(pageIndex);
  });

  // The approval-resume POST finishes a turn the user already spoke for.
  it("does not re-announce the page when the last message is the assistant's", async () => {
    await POST(
      req({
        messages: [
          { id: "m1", role: "user", parts: [{ type: "text", text: "add this job" }] },
          { id: "m2", role: "assistant", parts: [{ type: "text", text: "on it" }] },
        ],
        pageContext: { route: "/dashboard/myjobs/job-9", jobId: "job-9" },
      }),
    );
    const sent = JSON.stringify(streamArgs().messages);
    expect(sent).not.toContain("<page-context>");
  });
});
