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
      "add_job", "get_resume", "review_resume", "match_job", "generate_cover_letter", "add_question",
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
    expect(toolInvalidates("add_question")).toEqual(["page", "questionsList"]);
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
    // Root invariant: add_job is the only approval-gated tool
    expect(Object.keys(buildAgentToolApproval("x"))).toEqual(["add_job"]);
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

  describe("add_question settles", () => {
    const stop = buildAgentStopWhen()[AGENT_CHAT_TERMINAL_TOOLS.indexOf("add_question")];
    const questions = (n: number) => Array.from({ length: n }, (_, i) => ({ question: `Question ${i + 1}?` }));
    const item = (status: string, index = 1) => ({ index, question: "Q?", status });
    const check = (
      output: unknown,
      call: { input?: unknown; invalid?: boolean } = { input: { questions: questions(1) } },
    ) => {
      const toolCalls = [{ toolName: "add_question", ...call }];
      const toolResults = output === undefined ? [] : [{ toolName: "add_question", output }];
      return stop({ steps: [{ toolCalls, toolResults }] } as unknown as Parameters<typeof stop>[0]);
    };

    it("does not settle with no add_question call", async () => {
      expect(await stop({ steps: [{ toolCalls: [], toolResults: [] }] } as unknown as Parameters<typeof stop>[0])).toBe(false);
    });

    it("does not settle on a call with no result, since nothing awaits approval", async () => {
      expect(await check(undefined)).toBe(false);
    });

    it("does not settle on an error result", async () => {
      expect(await check({ items: [], error: "Saving the questions failed." })).toBe(false);
    });

    it.each(["similar", "exists", "invalid", "failed"])("does not settle while an item is %s", async (status) => {
      expect(await check({ items: [item("saved"), item(status, 2)] })).toBe(false);
    });

    it("settles when every item is saved, merged, skipped or a repeat", async () => {
      const output = { items: ["saved", "merged", "skipped", "repeat"].map((s, i) => item(s, i + 1)) };
      expect(await check(output, { input: { questions: questions(4) } })).toBe(true);
    });

    it("does not settle on an invalid call", async () => {
      expect(await check(undefined, { input: {}, invalid: true })).toBe(false);
    });

    const step = (output: unknown, n = 1) => ({
      toolCalls: [{ toolName: "add_question", input: { questions: questions(n) } }],
      toolResults: [{ toolName: "add_question", output }],
    });
    const stopAfter = (steps: unknown[]) => stop({ steps } as unknown as Parameters<typeof stop>[0]);
    const savedItems = (n: number) => ({ items: questions(n).map((_, i) => item("saved", i + 1)) });

    it("keeps the turn open after a held round is resolved, so the rest can still be sent", async () => {
      const held = { items: [...savedItems(19).items, item("similar", 20)] };
      expect(await stopAfter([step(held, 20), step(savedItems(1))])).toBe(false);
    });

    it("keeps the turn open when a later call saves while an earlier item is still held", async () => {
      expect(await stopAfter([step({ items: [item("similar")] }), step(savedItems(1))])).toBe(false);
    });

    it("settles a full call of 20 followed by the rest, all saved", async () => {
      expect(await stopAfter([step(savedItems(20), 20), step(savedItems(1))])).toBe(true);
    });

    it("settles a save after a step with no add_question call", async () => {
      expect(await stopAfter([{ toolCalls: [], toolResults: [] }, step(savedItems(1))])).toBe(true);
    });

    it("keeps the turn open after a full call of 20 so the rest can be sent", async () => {
      const full = { items: questions(20).map((_, i) => item("saved", i + 1)) };
      expect(await check(full, { input: { questions: questions(20) } })).toBe(false);
      expect(await check({ items: [item("saved")] }, { input: { questions: questions(1) } })).toBe(true);
    });
  });
});
