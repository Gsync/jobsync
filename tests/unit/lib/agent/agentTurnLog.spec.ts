import type { UIMessage } from "ai";
import { outcomeOf, turnSpanAttrs } from "@/lib/agent/turn/turnLog";

describe("outcomeOf", () => {
  it.each([
    ["get_resume", { status: "found" }, "found"],
    ["add_job", { created: true }, "created"],
    ["add_job", { created: false }, "duplicate"],
    ["add_job", { validationError: "missing" }, "validation"],
  ] as const)("reads %s output %j as %s", (tool, output, outcome) => {
    const message: UIMessage = {
      id: "m", role: "assistant", parts: [{
        type: `tool-${tool}`, toolCallId: "call", state: "output-available", input: {}, output,
      }],
    };
    expect(outcomeOf(message)).toEqual({ tool, state: "output-available", outcome });
  });

  it("reports none for a message without tools", () => {
    expect(outcomeOf({ id: "m", role: "assistant", parts: [] }))
      .toEqual({ tool: null, state: null, outcome: "none" });
  });
});

it("maps turn measurements to the existing span attributes", () => {
  expect(turnSpanAttrs({
    provider: "ollama", model: "test", tool: "add_job", toolState: "output-available",
    outcome: "created", aborted: false, pasteChars: 1, messageCount: 2, historyDropped: 3,
    systemChars: 4, toolChars: 5, messageChars: 6, sharedPrefixChars: 7, prefixChanged: true,
    loadMs: 8, promptEvalMs: 9, promptEvalTokens: 10, evalMs: 11,
    maxStepPromptTokens: 12, maxStepOutputTokens: 13,
  })).toEqual({
    "jobsync.tool": "add_job", "jobsync.tool_state": "output-available",
    "jobsync.outcome": "created", "jobsync.aborted": false,
    "jobsync.paste_chars": 1, "jobsync.message_count": 2, "jobsync.history_dropped": 3,
    "jobsync.system_chars": 4, "jobsync.tool_chars": 5, "jobsync.message_chars": 6,
    "jobsync.shared_prefix_chars": 7, "jobsync.prefix_changed": true,
    "jobsync.ollama.load_ms": 8, "jobsync.ollama.prompt_eval_ms": 9,
    "jobsync.ollama.prompt_eval_tokens": 10,
    "jobsync.ollama.eval_ms": 11, "jobsync.max_step_prompt_tokens": 12,
    "jobsync.max_step_output_tokens": 13,
  });
});
