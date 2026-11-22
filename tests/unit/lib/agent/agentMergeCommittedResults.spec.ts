import type { UIMessage } from "ai";
import { mergeCommittedResults } from "@/lib/agent/turn/mergeCommittedResults";

const user: UIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "add it" }] };
const approval = { id: "ap1", approved: true };
const pending = (toolCallId: string) => ({
  type: "tool-add_job", toolCallId, state: "approval-responded", input: { company: "Acme" }, approval,
});
const finished = (toolCallId: string) => ({
  type: "tool-add_job", toolCallId, state: "output-available", input: { company: "Acme" }, approval,
  output: { created: true, jobId: "j1", resolutions: [] },
});
const assistant = (...parts: unknown[]) => ({ id: "a1", role: "assistant", parts }) as UIMessage;

describe("mergeCommittedResults", () => {
  it("replaces an approval the server already finished with the stored result", () => {
    const incoming = [user, assistant({ type: "step-start" }, pending("c1"))];
    const stored = [user, assistant({ type: "step-start" }, finished("c1"))];
    expect(mergeCommittedResults(incoming, stored)).toEqual(
      [user, assistant({ type: "step-start" }, finished("c1"))],
    );
  });

  it("leaves parts without a finished stored match untouched", () => {
    const text = { type: "text", text: "Saved." };
    const incoming = [user, assistant(pending("c2"), finished("c3"), text), { ...user, id: "u2" }];
    const stored = [
      assistant({ ...pending("c2") }, { ...finished("c4") }),
      // Another tool's finished part never stands in for add_job.
      assistant({ ...finished("c2"), type: "tool-review_resume" }),
    ];
    expect(mergeCommittedResults(incoming, stored)).toEqual(incoming);
  });

  it("returns the incoming messages when nothing is stored", () => {
    const incoming = [user, assistant(pending("c1"))];
    expect(mergeCommittedResults(incoming, [])).toEqual(incoming);
  });
});
