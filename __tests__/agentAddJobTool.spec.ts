import { buildAddJobTool } from "@/lib/agent/tools/addJob";
import { buildAgentTools } from "@/lib/agent/tools";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";

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

describe("add_job agent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createJobFromNames as any).mockResolvedValue(created);
  });

  it("requires approval — a mutating tool can never execute unapproved", () => {
    expect(buildAddJobTool("user-1").needsApproval).toBe(true);
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

  it("registers exactly one tool in v1", () => {
    expect(Object.keys(buildAgentTools({ userId: "user-1" }))).toEqual(["add_job"]);
  });
});
