import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { recordToolProgress, runToolDirect } from "@/lib/agent/turn/runToolDirect";
import type { AgentToolName } from "@/lib/agent/registry";
import { AGENT_TOOL_PROGRESS_PART_TYPE } from "@/models/agent.model";

// The tool reports progress, then the turn is cancelled before it returns.
async function runCancelled(toolName: AgentToolName, output: unknown) {
  const chunks: unknown[] = [];
  const writer = { write: (chunk) => chunks.push(chunk), merge: vi.fn(), onError: undefined } as UIMessageStreamWriter;
  const progress = recordToolProgress(writer);
  const controller = new AbortController();
  const tools = {
    [toolName]: tool({
      inputSchema: z.object({}),
      execute: async (_input, { toolCallId }) => {
        progress.writer.write({ type: AGENT_TOOL_PROGRESS_PART_TYPE, id: toolCallId, data: { steps: ["a"] } });
        progress.writer.write({ type: AGENT_TOOL_PROGRESS_PART_TYPE, id: toolCallId, data: { steps: ["a", "save"] } });
        controller.abort();
        return output;
      },
    }),
  };
  const run = await runToolDirect({
    call: { toolName, toolCallId: "c1", input: {} },
    tools, toolApproval: {} as never, writer, lastProgress: progress.lastProgress,
    messages: [], abortSignal: controller.signal, onError: String,
  });
  return { run, chunks };
}

const okReview = { status: "ok", resumeId: "r1", title: "Engineer", scores: {}, body: "Good." };

describe("a direct call that returns after cancellation", () => {
  it.each([
    ["add_job", { created: true, jobId: "j1", resolutions: [] }],
    ["add_job", { created: false, duplicateOf: { id: "j0", title: "Engineer", company: "Acme" }, resolutions: [] }],
    ["review_resume", { ...okReview, saved: true }],
  ] as const)("commits a completed %s write %j", async (toolName, output) => {
    const { run, chunks } = await runCancelled(toolName, output);
    expect(chunks.at(-1)).toEqual({ type: "abort" });
    expect(run.committed).toEqual({
      toolName, toolCallId: "c1", input: {}, output, progress: { steps: ["a", "save"] },
    });
  });

  it.each([
    ["review_resume", { status: "generation_failed", title: "Engineer", reason: "The review stopped." }],
    ["match_job", { ...okReview, saved: false, saveError: "db down" }],
    ["generate_cover_letter", { status: "no_job" }],
    ["add_job", { created: false, resolutions: [], validationError: "company: Required" }],
  ] as const)("does not commit %s output %j", async (toolName, output) => {
    const { run, chunks } = await runCancelled(toolName, output);
    expect(chunks.at(-1)).toEqual({ type: "abort" });
    expect(run).toEqual({});
  });
});
