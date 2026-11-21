import type { UIMessage } from "ai";
import { withCommittedOutput } from "@/lib/agent/turn/persistTurn";
import { AGENT_TOOL_PROGRESS_PART_TYPE } from "@/models/agent.model";

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
