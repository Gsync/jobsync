import { isDeepStrictEqual } from "node:util";
import {
  asSchema, generateId, isToolUIPart, type ModelMessage, type ToolSet,
  type UIMessage, type UIMessageStreamWriter,
} from "ai";
import { AGENT_DIRECT_INVOKE_PART_TYPE } from "@/models/agent.model";
import { isDirectInvokeTool, type AgentToolName } from "../registry";
import type { buildAgentToolApproval } from "../tools";

type DirectCall = {
  toolName: AgentToolName;
  toolCallId: string;
  input: unknown;
  approval?: { confirmedInput: unknown };
};

// A tool that finished after cancellation, so the turn can still record it.
export type CommittedOutput = { toolName: AgentToolName; toolCallId: string; input: unknown; output: unknown };

// messages resumes the model; without them the turn is over.
export type DirectRun = { messages?: ModelMessage[]; committed?: CommittedOutput };

export function directCallFor(message?: UIMessage): DirectCall | undefined {
  if (message?.role === "assistant") {
    const step = message.parts.findLastIndex(part => part.type === "step-start");
    const calls = message.parts.slice(step + 1).filter(isToolUIPart);
    const [part] = calls;
    if (calls.length === 1 && part.type === "tool-add_job" &&
        part.state === "approval-responded" && part.approval.approved === true) {
      return {
        toolName: "add_job",
        toolCallId: part.toolCallId,
        input: Object.hasOwn(part.approval, "inputSchemaInput") ? part.approval.inputSchemaInput : part.input,
        approval: { confirmedInput: part.input },
      };
    }
    return;
  }
  if (message?.role !== "user") return;
  const part = message.parts.find(p => p.type === AGENT_DIRECT_INVOKE_PART_TYPE);
  if (part?.type !== AGENT_DIRECT_INVOKE_PART_TYPE) return;
  const data = part.data as { toolName?: string; input?: { resumeTitle?: unknown } } | null;
  if (typeof data?.toolName !== "string" || !isDirectInvokeTool(data.toolName)) return;
  const title = data.input?.resumeTitle;
  if (title !== undefined && (typeof title !== "string" || !title.trim())) return;
  return { toolName: data.toolName, toolCallId: generateId(), input: data.input };
}

// A completed tool result beside the approval tells the SDK it already ran.
export async function runToolDirect({ call, tools, toolApproval, writer, messages, abortSignal, onError }: {
  call: DirectCall;
  tools: ToolSet;
  toolApproval: ReturnType<typeof buildAgentToolApproval>;
  writer: UIMessageStreamWriter;
  messages: ModelMessage[];
  abortSignal: AbortSignal;
  onError: (error: unknown) => string;
}): Promise<DirectRun> {
  const { toolName, toolCallId, approval } = call;
  const tool = tools[toolName];
  const parsed = await asSchema(tool.inputSchema).validate?.(call.input);
  if (!parsed?.success) return { messages };
  // Schema transforms must reproduce the exact operation the user approved.
  if (approval && !isDeepStrictEqual(structuredClone(parsed.value), structuredClone(approval.confirmedInput))) {
    return { messages };
  }
  if (toolApproval[toolName]?.(parsed.value) === "user-approval" && !approval) return { messages };
  abortSignal.throwIfAborted();
  if (!approval) {
    writer.write({ type: "start" });
    writer.write({ type: "tool-input-available", toolCallId, toolName, input: parsed.value });
  }
  let output;
  try {
    output = await tool.execute!(parsed.value, { toolCallId, messages, abortSignal, context: {} });
  } catch (error) {
    if (abortSignal.aborted) {
      writer.write({ type: "abort" });
      return {};
    }
    writer.write({ type: "tool-output-error", toolCallId, errorText: onError(error) });
    writer.write({ type: "finish", finishReason: "error" });
    return {};
  }
  writer.write({ type: "tool-output-available", toolCallId, output });
  // The write already happened, so cancellation must not discard its result.
  if (abortSignal.aborted) {
    writer.write({ type: "abort" });
    return { committed: { toolName, toolCallId, input: parsed.value, output } };
  }
  if (approval && output?.validationError) {
    const last = messages.at(-1);
    if (last?.role !== "tool") throw new Error("Missing approval response");
    return { messages: [...messages.slice(0, -1), { ...last, content: [...last.content, {
      type: "tool-result", toolName, toolCallId, output: { type: "json", value: output },
    }] }] };
  }
  writer.write({ type: "finish", finishReason: "stop" });
  return {};
}
