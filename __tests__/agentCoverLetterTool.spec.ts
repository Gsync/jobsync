import { buildGenerateCoverLetterTool } from "@/lib/agent/tools/generateCoverLetter";
import { resolveJobForAgent } from "@/lib/agent/jobLookup";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { preprocessJob } from "@/lib/ai/tools/preprocessing-job";
import { generateCoverLetterForJob } from "@/actions/coverLetter.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { TEMPERATURES } from "@/lib/ai/config";
import {
  COVER_LETTER_SYSTEM_PROMPT,
  buildCoverLetterPrompt,
} from "@/lib/ai/prompts/cover-letter";

vi.mock("@/lib/agent/jobLookup", () => ({ resolveJobForAgent: vi.fn() }));
vi.mock("@/lib/agent/resumeLookup", () => ({ resolveResumeForAgent: vi.fn() }));
vi.mock("@/lib/ai/tools/preprocessing", () => ({ preprocessResume: vi.fn() }));
vi.mock("@/lib/ai/tools/preprocessing-job", () => ({ preprocessJob: vi.fn() }));
vi.mock("@/actions/coverLetter.actions", () => ({
  generateCoverLetterForJob: vi.fn(),
}));

const streamText = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, streamText: (...args: unknown[]) => streamText(...(args as [])) };
});

const findJob = resolveJobForAgent as unknown as ReturnType<typeof vi.fn>;
const findResume = resolveResumeForAgent as unknown as ReturnType<typeof vi.fn>;
const preResume = preprocessResume as unknown as ReturnType<typeof vi.fn>;
const preJob = preprocessJob as unknown as ReturnType<typeof vi.fn>;
const save = generateCoverLetterForJob as unknown as ReturnType<typeof vi.fn>;

const LETTER =
  "Dear Hiring Manager,\n\nI am writing to apply for the Senior Backend Engineer role.\n\nSincerely,\nAvery";

const RESUME_TEXT = "R".repeat(20_000);
const JOB_TEXT = "Job Title: Senior Backend Engineer\nCompany: Northwind Cloud";
const MATCH_DATA = JSON.stringify({
  body: "## Keywords\n\n- Kubernetes\n\n## Tailoring Tips\n\n- Lead with platform work.\n\n## Deal Breakers\n\n- No Go experience.",
});

function textStreamOf(chunks: string[], finishReason: unknown = "stop") {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
    })(),
    finishReason: Promise.resolve(finishReason),
  };
}

const writer = { write: vi.fn(), merge: vi.fn(), onError: undefined };

const ctx = (overrides: Record<string, unknown> = {}) => ({
  userId: "session-user",
  pageJobId: "job-1",
  model: { id: "fake-model" } as any,
  provider: "ollama",
  modelName: "qwen3.5:9b",
  writer: writer as any,
  guard: { running: false, elapsedMs: 0 },
  ...overrides,
});

const execute = (agentTool: any, input: any) =>
  agentTool.execute(input, { toolCallId: "call-1", messages: [] });

describe("generate_cover_letter agent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findJob.mockResolvedValue({
      status: "ok",
      job: {
        id: "job-1",
        resumeId: "r9",
        matchData: MATCH_DATA,
        descriptionCompleteness: "full",
        JobTitle: { label: "Senior Backend Engineer" },
        Company: { label: "Northwind Cloud" },
      },
    });
    findResume.mockResolvedValue({
      status: "ok",
      resume: { id: "r9", title: "Senior Engineer Resume" },
      source: "page",
      ambiguousTitle: false,
    });
    preResume.mockResolvedValue({
      success: true,
      data: { normalizedText: RESUME_TEXT, metadata: {}, isValid: true },
    });
    preJob.mockResolvedValue({
      success: true,
      data: { normalizedText: JOB_TEXT, metadata: {}, isValid: true },
    });
    streamText.mockReturnValue(textStreamOf([LETTER]));
    save.mockResolvedValue({
      success: true,
      data: { id: "cl-1", title: "Senior Backend Engineer - Northwind Cloud" },
    });
  });

  // The gate exists to stop unseen writes. The user watches the whole letter
  // stream before it lands, and it lands in their own documents.
  it("has no approval gate", () => {
    expect(buildGenerateCoverLetterTool(ctx()).needsApproval).toBeUndefined();
  });

  it("is registered in the tool registry", async () => {
    const { buildAgentTools } = await import("@/lib/agent/tools");
    const tools = buildAgentTools({
      ...ctx(),
      pageContext: { jobId: "job-1" },
    } as any);
    expect(Object.keys(tools)).toContain("generate_cover_letter");
  });

  it("passes the SESSION userId and the PAGE job id, never model input", async () => {
    await execute(buildGenerateCoverLetterTool(ctx()), {
      userId: "attacker-user",
      jobId: "someone-elses-job",
    });
    expect(findJob).toHaveBeenCalledWith("session-user", "job-1");
  });

  it("returns no_job without generating when no job is in page context", async () => {
    findJob.mockResolvedValue({ status: "no_job" });
    const result = await execute(
      buildGenerateCoverLetterTool(ctx({ pageJobId: undefined })),
      {},
    );
    expect(result).toEqual({ status: "no_job" });
    expect(streamText).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  // The retired route's 400. A title-only stub has nothing to write from.
  it("refuses a title-only job without generating", async () => {
    findJob.mockResolvedValue({
      status: "ok",
      job: {
        id: "job-1",
        descriptionCompleteness: "title-only",
        JobTitle: { label: "Senior Backend Engineer" },
        Company: { label: "Northwind Cloud" },
      },
    });
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result).toEqual({
      status: "no_description",
      jobTitle: "Senior Backend Engineer",
    });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("resolves the resume from the job's linked resume when none is named", async () => {
    await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(findResume).toHaveBeenCalledWith("session-user", {
      title: undefined,
      pageResumeId: "r9",
    });
  });

  it("forwards only the resume title the user named", async () => {
    await execute(buildGenerateCoverLetterTool(ctx()), {
      resumeId: "someone-elses-resume",
      resumeTitle: "Product Manager Resume",
    });
    expect(findResume).toHaveBeenCalledWith("session-user", {
      title: "Product Manager Resume",
      pageResumeId: "r9",
    });
  });

  // Parity, asserted on the exact inputs the retired route used.
  it("generates with the retired route's prompt, temperature and context", async () => {
    await execute(buildGenerateCoverLetterTool(ctx()), {});
    const args = streamText.mock.calls[0][0];
    expect(args.system).toBe(COVER_LETTER_SYSTEM_PROMPT);
    expect(args.temperature).toBe(TEMPERATURES.FEEDBACK);
    expect(args.providerOptions.ollama.options.num_ctx).toBe(
      APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
    );
    expect(args.abortSignal).toBeDefined();
  });

  // Only the two actionable sections travel: the rest would push the letter
  // toward apologising for gaps instead of selling strengths.
  it("passes the saved match's keywords and tips as guidance", async () => {
    await execute(buildGenerateCoverLetterTool(ctx()), {});
    const { prompt } = streamText.mock.calls[0][0];
    expect(prompt).toBe(
      buildCoverLetterPrompt(
        RESUME_TEXT,
        JOB_TEXT,
        "## Keywords\n- Kubernetes\n\n## Tailoring Tips\n- Lead with platform work.",
      ),
    );
    expect(prompt).toContain("Kubernetes");
    expect(prompt).not.toContain("Deal Breakers");
  });

  it("generates without guidance when the job has no saved match", async () => {
    findJob.mockResolvedValue({
      status: "ok",
      job: {
        id: "job-1",
        resumeId: "r9",
        matchData: null,
        descriptionCompleteness: "full",
        JobTitle: { label: "Senior Backend Engineer" },
        Company: { label: "Northwind Cloud" },
      },
    });
    await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(streamText.mock.calls[0][0].prompt).toBe(
      buildCoverLetterPrompt(RESUME_TEXT, JOB_TEXT, null),
    );
  });

  // The chat loop needs think:true; a sub-call with no tools does not.
  it("does not enable the thinking channel on the sub-call", async () => {
    await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(streamText.mock.calls[0][0].providerOptions.ollama.think).toBeUndefined();
  });

  it("streams the sub-call's tokens as transient parts keyed by the tool call", async () => {
    streamText.mockReturnValue(textStreamOf(["Dear Hiring ", "Manager,"]));
    await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(writer.write).toHaveBeenCalledTimes(2);
    const first = writer.write.mock.calls[0][0];
    expect(first.type).toBe("data-nested-stream");
    expect(first.id).toBe("call-1");
    expect(first.transient).toBe(true);
  });

  it("returns the letter and where it was saved", async () => {
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result.status).toBe("ok");
    expect(result.jobId).toBe("job-1");
    expect(result.jobTitle).toBe("Senior Backend Engineer");
    expect(result.company).toBe("Northwind Cloud");
    expect(result.resumeTitle).toBe("Senior Engineer Resume");
    expect(result.body).toContain("Dear Hiring Manager");
    expect(result.coverLetterId).toBe("cl-1");
    expect(result.coverLetterTitle).toBe(
      "Senior Backend Engineer - Northwind Cloud",
    );
    expect(result.saved).toBe(true);
  });

  it("strips reasoning blocks out of the saved letter", async () => {
    streamText.mockReturnValue(
      textStreamOf(["<think>planning the letter</think>", LETTER]),
    );
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result.body).not.toContain("<think>");
    expect(save.mock.calls[0][1]).not.toContain("planning the letter");
  });

  it("does not return the resume text or the job text to the model", async () => {
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(JSON.stringify(result)).not.toContain(RESUME_TEXT);
    expect(JSON.stringify(result)).not.toContain(JOB_TEXT);
  });

  it("saves the letter itself, scoped to the job it was written for", async () => {
    await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(save).toHaveBeenCalledTimes(1);
    const [jobId, markdown] = save.mock.calls[0];
    expect(jobId).toBe("job-1");
    expect(markdown).toContain("Dear Hiring Manager");
  });

  it("reports a save failure in the result instead of swallowing it", async () => {
    save.mockResolvedValue({ success: false, message: "Database is locked." });
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result.status).toBe("ok");
    expect(result.saved).toBe(false);
    expect(result.saveError).toBe("Database is locked.");
    expect(result.body).toContain("Dear Hiring Manager");
  });

  // A truncated letter is not destructive the way a truncated match is, but it
  // still lands in Profile -> Documents for the user to delete by hand.
  it.each(["other", "length"])(
    "saves nothing when the stream ends with finishReason %s",
    async (finishReason) => {
      streamText.mockReturnValue(
        textStreamOf(["Dear Hiring Manager,\n\nI am writ"], finishReason),
      );
      const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
      expect(result.status).toBe("generation_failed");
      expect(save).not.toHaveBeenCalled();
    },
  );

  it("returns generation_failed rather than throwing, without echoing the error", async () => {
    streamText.mockReturnValue({
      textStream: (async function* () {
        throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
      })(),
    });
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result.status).toBe("generation_failed");
    expect(JSON.stringify(result)).not.toContain("ECONNREFUSED");
    expect(save).not.toHaveBeenCalled();
  });

  it("saves nothing when the letter comes back empty", async () => {
    streamText.mockReturnValue(textStreamOf(["   "]));
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result.status).toBe("generation_failed");
    expect(save).not.toHaveBeenCalled();
  });

  // The guard is shared with the other two nested tools, per request.
  it("declines to start while another nested generation is running", async () => {
    const result = await execute(
      buildGenerateCoverLetterTool(ctx({ guard: { running: true, elapsedMs: 0 } })),
      {},
    );
    expect(result.status).toBe("generation_failed");
    expect(streamText).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("passes needs_selection straight through without generating", async () => {
    findResume.mockResolvedValue({
      status: "needs_selection",
      resumes: [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
    });
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result).toEqual({
      status: "needs_selection",
      resumes: [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
    });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns no_resumes without generating", async () => {
    findResume.mockResolvedValue({ status: "no_resumes" });
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result).toEqual({ status: "no_resumes" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("says which document was unreadable when the job fails preprocessing", async () => {
    preJob.mockResolvedValue({
      success: false,
      error: { code: "TOO_SHORT", message: "Job description is too short" },
    });
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result.status).toBe("unreadable");
    expect(result.what).toBe("job");
    expect(result.title).toBe("Senior Backend Engineer");
    expect(streamText).not.toHaveBeenCalled();
  });

  it("says which document was unreadable when the resume fails preprocessing", async () => {
    preResume.mockResolvedValue({
      success: false,
      error: { code: "TOO_SHORT", message: "Resume is too short" },
    });
    const result = await execute(buildGenerateCoverLetterTool(ctx()), {});
    expect(result.status).toBe("unreadable");
    expect(result.what).toBe("resume");
    expect(result.title).toBe("Senior Engineer Resume");
    expect(streamText).not.toHaveBeenCalled();
  });
});
