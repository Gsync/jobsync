import { buildAddJobTool } from "@/lib/agent/tools/addJob";
import { buildAgentTools } from "@/lib/agent/tools";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { JobResolutionError } from "@/lib/jobs/resolve";
import { addJobSettled } from "@/models/agent.model";

vi.mock("@/lib/jobs/createJobFromNames", () => ({ createJobFromNames: vi.fn() }));

const created = {
  created: true,
  jobId: "job-1",
  resolutions: [{ id: "c1", label: "Acme", created: true }],
  descriptionCompleteness: "full",
  message: 'Created Acme; Matched Engineer. Job created (id: job-1).',
};

const longDescription = Array.from({ length: 200 }, () => "word").join(" ");
const execute = (tool: any, input: any) => tool.execute(input, { toolCallId: "c", messages: [] });

// review_resume needs the resolved model and the stream writer, so the
// registry's context object is wider than a read tool's own arguments.
const toolCtx = {
  userId: "user-1",
  model: {} as any,
  provider: "ollama",
  modelName: "qwen3.5:9b",
  writer: { write: () => {}, merge: () => {}, onError: undefined } as any,
};

describe("add_job agent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createJobFromNames as any).mockResolvedValue(created);
  });

  const needsApproval = (tool: any, input: any) =>
    tool.needsApproval(input, { toolCallId: "c", messages: [] });

  it("requires approval — a mutating tool can never execute unapproved", () => {
    expect(needsApproval(buildAddJobTool("user-1"), { company: "Acme", jobTitle: "Engineer", jobDescription: longDescription })).toBe(true);
    expect(needsApproval(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer" })).toBe(true);
  });

  // The card renders before execute runs, so asking for a call execute is
  // already certain to reject spends a Confirm, and the retry spends a second
  // one — the user confirms the same job twice.
  it("skips approval only for a call that cannot write", () => {
    expect(needsApproval(buildAddJobTool("user-1"), { company: "Acme", jobTitle: "Engineer" })).toBe(false);
  });

  it("passes the SESSION userId, never one supplied by the model", async () => {
    const tool = buildAddJobTool("session-user");
    await execute(tool, { company: "Acme", jobTitle: "Engineer", jobDescription: longDescription, userId: "attacker-user" });
    const [, userId] = (createJobFromNames as any).mock.calls[0];
    expect(userId).toBe("session-user");
    expect((createJobFromNames as any).mock.calls[0][0].userId).toBeUndefined();
  });

  it("splices the closure's pasted text over anything the model sent", async () => {
    const tool = buildAddJobTool("user-1", "THE REAL PASTED POSTING");
    await execute(tool, { company: "Acme", jobTitle: "Engineer", jobDescription: "a paraphrase the model wrote" });
    expect((createJobFromNames as any).mock.calls[0][0].jobDescription).toBe("THE REAL PASTED POSTING");
  });

  it("falls back to the model's description when nothing was pasted", async () => {
    const tool = buildAddJobTool("user-1");
    await execute(tool, { company: "Acme", jobTitle: "Engineer", jobDescription: longDescription });
    expect((createJobFromNames as any).mock.calls[0][0].jobDescription).toBe(longDescription);
  });

  // An omitted dueDate must arrive as undefined so createJobFromNames'
  // 3-day default applies; a supplied one arrives parsed.
  it("passes dueDate through, parsed, and leaves an omitted one to the default", async () => {
    const tool = buildAddJobTool("user-1", "posting");
    await execute(tool, { company: "Acme", jobTitle: "Engineer", dueDate: "2030-02-01T00:00:00Z" });
    await execute(tool, { company: "Acme", jobTitle: "Engineer" });
    const calls = (createJobFromNames as any).mock.calls;
    expect(calls[0][0].dueDate).toEqual(new Date("2030-02-01T00:00:00Z"));
    expect(calls[1][0].dueDate).toBeUndefined();
  });

  it('sets createdVia to "chat"', async () => {
    await execute(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer" });
    expect((createJobFromNames as any).mock.calls[0][0].createdVia).toBe("chat");
  });

  it("never forwards allowDuplicate, even if the model invents it", async () => {
    await execute(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer", allowDuplicate: true, upsert: true });
    const passed = (createJobFromNames as any).mock.calls[0][0];
    expect(passed.allowDuplicate).toBeUndefined();
    expect(passed.upsert).toBeUndefined();
  });

  it("returns structured fields and not the helper's agent-facing message", async () => {
    const result: any = await execute(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer" });
    expect(result).toMatchObject({
      created: true,
      jobId: "job-1",
      descriptionSource: "pasted",
      descriptionCompleteness: "full",
    });
    expect(result.message).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("update_job");
    expect(JSON.stringify(result)).not.toContain("allowDuplicate");
  });

  it("reports a duplicate without creating a second job", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: false,
      duplicateOf: { id: "job-9", title: "Engineer", company: "Acme" },
      resolutions: [],
      message: 'Duplicate detected — call update_job with jobId "job-9". Pass allowDuplicate: true ...',
    });
    const result: any = await execute(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer" });
    expect(result.created).toBe(false);
    expect(result.duplicateOf.id).toBe("job-9");
    expect(JSON.stringify(result)).not.toContain("update_job");
  });

  it("returns a validation message rather than throwing when no description exists", async () => {
    const result: any = await execute(buildAddJobTool("user-1"), { company: "Acme", jobTitle: "Engineer" });
    expect(result.validationError).toMatch(/description/i);
    expect(createJobFromNames).not.toHaveBeenCalled();
  });

  // The model reaches here having omitted jobDescription because the posting
  // looked pasted to it, so the recovery it needs is "copy it from the
  // message", not "ask again". Asking again is what produced a paraphrase.
  it("tells the model to copy an unchipped posting verbatim rather than summarise it", async () => {
    const result: any = await execute(buildAddJobTool("user-1"), { company: "Acme", jobTitle: "Engineer" });
    expect(result.validationError).toMatch(/verbatim/i);
    expect(result.validationError).toMatch(/summar|shorten|condense/i);
  });

  // The card renders displayError when there is one, so that text is the
  // user's whole view of this failure — it must not carry the model's
  // instructions to itself.
  it("gives the card its own copy, free of the model's retry instructions", async () => {
    const result: any = await execute(buildAddJobTool("user-1"), { company: "Acme", jobTitle: "Engineer" });
    expect(result.displayError).toMatch(/description/i);
    expect(result.displayError).not.toMatch(/verbatim|jobDescription|add_job|call it again/i);
  });

  // Zod's messages name the field and its accepted values, so they read fine
  // on the card as they are and deliberately set no displayError.
  it("leaves a schema message unaltered for the card", async () => {
    const result: any = await execute(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer", dueDate: "next friday" });
    expect(result.displayError).toBeUndefined();
  });

  it("returns a ZodError from the in-execute parse as a tool result, not a throw", async () => {
    const result: any = await execute(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer", dueDate: "next friday" });
    expect(result.validationError).toMatch(/dueDate/);
    expect(createJobFromNames).not.toHaveBeenCalled();
  });

  it("returns a tool result rather than throwing when the helper fails", async () => {
    (createJobFromNames as any).mockRejectedValue(new Error("db is down"));
    const result: any = await execute(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer" });
    expect(result.validationError).toBeTruthy();
    expect(result.validationError).not.toContain("db is down");
  });

  // An unusable enum value is the model's mistake to fix, so it has to see
  // which field and which values. Without this it guessed, and its guess was
  // to drop the field — losing a value the posting actually stated.
  it("surfaces a resolver's validation message so the model can retry", async () => {
    (createJobFromNames as any).mockRejectedValue(
      new JobResolutionError('Invalid workplaceType "Moon Base". Valid values: Remote, Hybrid, Onsite'),
    );
    const result: any = await execute(buildAddJobTool("user-1", "posting"), { company: "Acme", jobTitle: "Engineer" });
    expect(result.created).toBe(false);
    expect(result.validationError).toContain("workplaceType");
    expect(result.validationError).toContain("Onsite");
  });

  // Skipping approval moves the failure into the step that made the call, so
  // the terminal-tool stop condition has to let that one step be retried.
  describe("addJobSettled", () => {
    const call = [{ toolName: "add_job" }];

    it("does not end the turn on a validation failure", () => {
      expect(addJobSettled({ toolCalls: call, toolResults: [{ toolName: "add_job", output: { created: false, validationError: "no description" } }] })).toBe(false);
    });

    // An input-schema failure produces a tool-call marked invalid and no tool
    // result, which is indistinguishable from a pending approval without it.
    it("does not end the turn on a schema-invalid call", () => {
      expect(addJobSettled({ toolCalls: [{ toolName: "add_job", invalid: true }], toolResults: [] })).toBe(false);
    });

    it("ends the turn on a write, a duplicate, or a pending approval", () => {
      expect(addJobSettled({ toolCalls: call, toolResults: [{ toolName: "add_job", output: { created: true, jobId: "job-1" } }] })).toBe(true);
      expect(addJobSettled({ toolCalls: call, toolResults: [{ toolName: "add_job", output: { created: false, duplicateOf: { id: "job-9" } } }] })).toBe(true);
      expect(addJobSettled({ toolCalls: call, toolResults: [] })).toBe(true);
    });

    it("ignores a step that did not call add_job", () => {
      expect(addJobSettled({ toolCalls: [{ toolName: "get_resume" }], toolResults: [] })).toBe(false);
      expect(addJobSettled({})).toBe(false);
    });
  });

  it("registers exactly the tools the chat exposes", () => {
    expect(Object.keys(buildAgentTools(toolCtx))).toEqual([
      "add_job",
      "get_resume",
      "review_resume",
      "match_job",
      "generate_cover_letter",
    ]);
  });
});
