import {
  AGENT_CHAT_TERMINAL_TOOLS,
  AGENT_TOOL_META,
  AGENT_TOOL_NAMES,
  toolInvalidates,
} from "@/lib/agent/registry";
import {
  buildAgentStopWhen,
  buildAgentToolApproval,
  buildAgentTools,
  type AgentToolContext,
} from "@/lib/agent/tools";

describe("agent tool metadata", () => {
  it("preserves the model's tool order", () => {
    expect(AGENT_TOOL_NAMES).toEqual([
      "add_job", "get_resume", "review_resume", "match_job", "generate_cover_letter",
    ]);
  });

  it("ends workflows and bounds results that return to the model", () => {
    for (const meta of Object.values(AGENT_TOOL_META)) {
      if (meta.kind === "workflow") expect(meta.terminal).toBe(true);
      if (!meta.terminal) expect(meta.maxResultChars).toEqual(expect.any(Number));
    }
  });

  it("declares unique step ids per tool", () => {
    for (const meta of Object.values(AGENT_TOOL_META)) {
      const ids = meta.steps.map((step) => step.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("gives every workflow a generate step", () => {
    for (const meta of Object.values(AGENT_TOOL_META)) {
      if (meta.kind !== "workflow") continue;
      expect(meta.steps.map((step) => step.id)).toContain("generate");
    }
  });

  it("gives get_resume no steps", () => {
    expect(AGENT_TOOL_META.get_resume.steps).toEqual([]);
  });

  it("returns the refresh targets for a tool", () => {
    expect(toolInvalidates("match_job")).toEqual(["page", "jobsList"]);
    expect(toolInvalidates("not_a_tool")).toEqual([]);
  });
});

describe("agent tool server map", () => {
  it("builds every tool in prefix order with approval configured separately", () => {
    const tools = buildAgentTools({
      userId: "user-1",
      model: {} as AgentToolContext["model"],
      modelName: "test",
      provider: "ollama",
      writer: { write() {}, merge() {}, onError: undefined },
      nestedGuard: { running: false, elapsedMs: 0 },
    });
    expect(Object.keys(tools)).toEqual(AGENT_TOOL_NAMES);
    for (const tool of Object.values(tools)) expect(tool).not.toHaveProperty("needsApproval");
    expect(Object.keys(buildAgentToolApproval("x"))).toEqual(
      AGENT_TOOL_NAMES.filter((name) => AGENT_TOOL_META[name].kind === "write"),
    );
  });

  it("stops for pending approval and lets the model retry a validation error", async () => {
    const conditions = buildAgentStopWhen();
    expect(conditions).toHaveLength(AGENT_CHAT_TERMINAL_TOOLS.length);
    const stop = conditions[AGENT_CHAT_TERMINAL_TOOLS.indexOf("add_job")];
    const toolCalls = [{ toolName: "add_job" }];
    const check = (toolResults: unknown[]) =>
      stop({ steps: [{ toolCalls, toolResults }] } as Parameters<typeof stop>[0]);
    expect(await check([])).toBe(true);
    expect(await check([{ toolName: "add_job", output: { validationError: "missing" } }])).toBe(false);
  });
});
