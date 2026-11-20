import type { UIMessage } from "ai";
import { buildModelMessages } from "@/lib/agent/memory/modelMessages";
import { AGENT_PASTE_ONLY_USER_MESSAGE, buildPageContextMessage } from "@/lib/agent/prompt";

const message = (role: UIMessage["role"], id = "m"): UIMessage => ({
  id, role, parts: [{ type: "text", text: "hello" }],
});

describe("buildModelMessages", () => {
  it("reports a rejected transcript conversion", async () => {
    expect(await buildModelMessages({ messages: [message("unknown" as UIMessage["role"])] }))
      .toEqual({ ok: false });
  });

  it("keeps a chip-only user turn and appends the page block", async () => {
    const chip: UIMessage = { id: "p", role: "user", parts: [{ type: "data-paste", data: { text: "posting" } }] };
    expect(await buildModelMessages({ messages: [chip] })).toEqual({
      ok: true, historyDropped: 0, modelMessages: [
        { role: "user", content: AGENT_PASTE_ONLY_USER_MESSAGE },
        { role: "user", content: buildPageContextMessage(undefined) },
      ],
    });
  });

  it("appends pasted text after the page block", async () => {
    const result = await buildModelMessages({ messages: [message("user")], pastedText: "posting" });
    expect(result.ok && result.modelMessages.slice(1)).toEqual([
      { role: "user", content: buildPageContextMessage(undefined) },
      { role: "user", content: expect.stringContaining("\nposting\n") },
    ]);
  });

  it("leaves the assistant last when resuming a turn", async () => {
    const result = await buildModelMessages({ messages: [message("assistant")], pastedText: "posting" });
    expect(result.ok && result.modelMessages).toEqual([expect.objectContaining({ role: "assistant" })]);
  });

  it("keeps each historical page beside its user turn and uses live context for the latest turn", async () => {
    const marked = (pageLocation: string) => ({ ...message("user"), metadata: { pageLocation } });
    const result = await buildModelMessages({
      messages: [message("user"), marked("jobs-list"), marked("__proto__"), message("assistant"), marked("elsewhere")],
      pageContext: { jobId: "current" },
    });
    const hello = { role: "user", content: [{ type: "text", text: "hello" }] };
    const hint = (text: string) => ({ role: "user", content: [{ type: "text", text }] });
    expect(result.ok && result.modelMessages).toEqual([
      hello, hello, hint(buildPageContextMessage({ route: "/dashboard/myjobs" })),
      hello, hint(buildPageContextMessage(undefined)), expect.objectContaining({ role: "assistant" }),
      hello, hint(buildPageContextMessage({ jobId: "current" })),
    ]);
  });

  it("keeps the historical page on approval without repeating the pasted posting", async () => {
    const user = { ...message("user"), metadata: { pageLocation: "resume" } };
    const result = await buildModelMessages({ messages: [user, message("assistant")], pastedText: "posting" });
    expect(result.ok && result.modelMessages).toEqual([
      expect.objectContaining({ role: "user" }),
      { role: "user", content: [{ type: "text", text: buildPageContextMessage({ resumeId: "resume" }) }] },
      expect.objectContaining({ role: "assistant" }),
    ]);
  });

  it("counts dropped transcript messages before adding context", async () => {
    const messages = Array.from({ length: 25 }, (_, i) => message("user", String(i)));
    expect(await buildModelMessages({ messages })).toMatchObject({ ok: true, historyDropped: 9 });
  });
});
