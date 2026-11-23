import type { UIMessage } from "ai";
import { persistTurn, withCommittedOutput } from "@/lib/agent/turn/persistTurn";
import { saveChatConversation } from "@/actions/agentChat.actions";
import { AGENT_PASTE_PART_TYPE, AGENT_TOOL_PROGRESS_PART_TYPE } from "@/models/agent.model";

vi.mock("@/actions/agentChat.actions", () => ({
  saveChatConversation: vi.fn(),
  updateChatConversation: vi.fn(),
}));

const user: UIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "add it" }] };
const output = { created: true, jobId: "j1", resolutions: [] };
const progress = { steps: ["resolve", "save"] };
const progressPart = { type: AGENT_TOOL_PROGRESS_PART_TYPE, id: "c1", data: progress };

describe("withCommittedOutput", () => {
  it("keeps the progress steps beside an approved write", () => {
    const approved = {
      id: "a1", role: "assistant",
      parts: [
        { type: "step-start" },
        { type: AGENT_TOOL_PROGRESS_PART_TYPE, id: "c1", data: { steps: ["resolve"] } },
        { type: "tool-add_job", toolCallId: "c1", state: "approval-responded", input: {}, approval: { id: "ap1", approved: true } },
      ],
    } as UIMessage;
    const [, saved] = withCommittedOutput([user, approved], {
      toolName: "add_job", toolCallId: "c1", input: {}, output, progress,
    });
    expect(saved.parts).toEqual([
      { type: "step-start" },
      progressPart,
      expect.objectContaining({ toolCallId: "c1", state: "output-available", output }),
    ]);
  });

  it("keeps the progress steps on a direct invoke's new message", () => {
    const [, saved] = withCommittedOutput([user], {
      toolName: "review_resume", toolCallId: "c1", input: {}, output, progress,
    });
    expect(saved.parts).toEqual([
      { type: "step-start" },
      progressPart,
      { type: "tool-review_resume", toolCallId: "c1", state: "output-available", input: {}, output },
    ]);
  });

  it("adds no progress part when none was written", () => {
    const [, saved] = withCommittedOutput([user], {
      toolName: "review_resume", toolCallId: "c1", input: {}, output,
    });
    expect(saved.parts.map(part => part.type)).toEqual(["step-start", "tool-review_resume"]);
  });
});

describe("persistTurn", () => {
  const paste = (id: string, text: string) => ({
    type: AGENT_PASTE_PART_TYPE, id,
    data: { id, text, chars: text.length, truncated: false, consumed: false },
  });

  // The agent asked about answers for list B; a reload must still have it.
  it("keeps a second list pasted after the first was saved", async () => {
    const finalMessages = [
      { id: "u1", role: "user", parts: [paste("pA", "LIST_A")] },
      { id: "a1", role: "assistant", parts: [{
        type: "tool-add_question", toolCallId: "q1", state: "output-available", input: {},
        output: { items: [{ index: 0, question: "Q", status: "saved", tags: [], droppedTags: [] }] },
      }] },
      { id: "u2", role: "user", parts: [paste("pB", "LIST_B")] },
      { id: "a2", role: "assistant", parts: [{ type: "text", text: "Any answers?" }] },
    ] as unknown as UIMessage[];
    await persistTurn({ messages: finalMessages, finalMessages, aborted: false });
    const saved = vi.mocked(saveChatConversation).mock.calls[0]![0] as any[];
    expect(saved[2].parts[0].data.text).toBe("LIST_B");
    expect(saved[0].parts[0].data.consumed).toBe(true);
  });
});
