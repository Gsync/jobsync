import { buildMatchJobTool } from "@/lib/agent/tools/matchJob";
import { resolveJobForAgent } from "@/lib/agent/jobLookup";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { preprocessJob } from "@/lib/ai/tools/preprocessing-job";
import { saveJobMatchResult } from "@/actions/job.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { TEMPERATURES } from "@/lib/ai/config";
import {
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchPrompt,
} from "@/lib/ai/prompts/job-match";

vi.mock("@/lib/agent/jobLookup", () => ({ resolveJobForAgent: vi.fn() }));
vi.mock("@/lib/agent/resumeLookup", () => ({ resolveResumeForAgent: vi.fn() }));
vi.mock("@/lib/ai/tools/preprocessing", () => ({ preprocessResume: vi.fn() }));
vi.mock("@/lib/ai/tools/preprocessing-job", () => ({ preprocessJob: vi.fn() }));
vi.mock("@/actions/job.actions", () => ({ saveJobMatchResult: vi.fn() }));

const streamText = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, streamText: (...args: unknown[]) => streamText(...(args as [])) };
});

const findJob = resolveJobForAgent as unknown as ReturnType<typeof vi.fn>;
const findResume = resolveResumeForAgent as unknown as ReturnType<typeof vi.fn>;
const preResume = preprocessResume as unknown as ReturnType<typeof vi.fn>;
const preJob = preprocessJob as unknown as ReturnType<typeof vi.fn>;
const save = saveJobMatchResult as unknown as ReturnType<typeof vi.fn>;

const MATCH =
  "SCORES: match=72 recommendation=good\n\n## Summary\n\nStrong backend overlap.";

const RESUME_TEXT = "R".repeat(20_000);
const JOB_TEXT = "Job Title: Senior Backend Engineer\nCompany: Northwind Cloud";

function textStreamOf(chunks: string[], finishReason: unknown = "stop") {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
    })(),
    finishReason: Promise.resolve(finishReason),
  };
}

const writer = { write: vi.fn(), merge: vi.fn(), onError: undefined };

const ctx = () => ({
  userId: "session-user",
  pageJobId: "job-1",
  model: { id: "fake-model" } as any,
  provider: "ollama",
  modelName: "qwen3.5:9b",
  writer: writer as any,
  guard: { running: false },
});

const execute = (agentTool: any, input: any) =>
  agentTool.execute(input, { toolCallId: "call-1", messages: [] });

describe("match_job agent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findJob.mockResolvedValue({
      status: "ok",
      job: {
        id: "job-1",
        resumeId: "r9",
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
    streamText.mockReturnValue(textStreamOf([MATCH]));
    save.mockResolvedValue({ success: true });
  });

  // The gate exists to stop unseen writes. This writes only matchData on the
  // caller's own job, and they watch it stream.
  it("has no approval gate", () => {
    expect(buildMatchJobTool(ctx()).needsApproval).toBeUndefined();
  });

  it("is registered in the tool registry", async () => {
    const { buildAgentTools } = await import("@/lib/agent/tools");
    const tools = buildAgentTools({ ...ctx(), pageContext: { jobId: "job-1" } } as any);
    expect(Object.keys(tools)).toContain("match_job");
  });

  it("passes the SESSION userId and the PAGE job id, never model input", async () => {
    await execute(buildMatchJobTool(ctx()), {
      userId: "attacker-user",
      jobId: "someone-elses-job",
    });
    expect(findJob).toHaveBeenCalledWith("session-user", "job-1");
  });

  it("returns no_job without generating when no job is in page context", async () => {
    findJob.mockResolvedValue({ status: "no_job" });
    const result = await execute(buildMatchJobTool({ ...ctx(), pageJobId: undefined }), {});
    expect(result).toEqual({ status: "no_job" });
    expect(streamText).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  // The job's linked resume takes the "page" slot: on a job page there is no
  // pageContext.resumeId, and job.resumeId is the closest thing to one.
  it("resolves the resume from the job's linked resume when none is named", async () => {
    await execute(buildMatchJobTool(ctx()), {});
    expect(findResume).toHaveBeenCalledWith("session-user", {
      title: undefined,
      pageResumeId: "r9",
    });
  });

  it("forwards only the resume title the user named", async () => {
    await execute(buildMatchJobTool(ctx()), {
      resumeId: "someone-elses-resume",
      resumeTitle: "Product Manager Resume",
    });
    expect(findResume).toHaveBeenCalledWith("session-user", {
      title: "Product Manager Resume",
      pageResumeId: "r9",
    });
  });

  // Parity, asserted on the exact five inputs the retired route used.
  it("generates with the retired route's prompt, temperature and context", async () => {
    await execute(buildMatchJobTool(ctx()), {});
    const args = streamText.mock.calls[0][0];
    expect(args.system).toBe(JOB_MATCH_SYSTEM_PROMPT);
    expect(args.prompt).toBe(buildJobMatchPrompt(RESUME_TEXT, JOB_TEXT));
    expect(args.temperature).toBe(TEMPERATURES.FEEDBACK);
    expect(args.providerOptions.ollama.options.num_ctx).toBe(
      APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
    );
    expect(args.abortSignal).toBeDefined();
  });

  // The chat loop needs think:true; a sub-call with no tools does not.
  it("does not enable the thinking channel on the sub-call", async () => {
    await execute(buildMatchJobTool(ctx()), {});
    expect(streamText.mock.calls[0][0].providerOptions.ollama.think).toBeUndefined();
  });

  it("streams the sub-call's tokens as transient parts keyed by the tool call", async () => {
    streamText.mockReturnValue(
      textStreamOf(["SCORES: ", "match=72 recommendation=good\n\nBody"]),
    );
    await execute(buildMatchJobTool(ctx()), {});
    expect(writer.write).toHaveBeenCalledTimes(2);
    const first = writer.write.mock.calls[0][0];
    expect(first.type).toBe("data-nested-stream");
    expect(first.id).toBe("call-1");
    expect(first.transient).toBe(true);
  });

  it("returns the score and the markdown body, with the scores line stripped", async () => {
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(result.status).toBe("ok");
    expect(result.jobId).toBe("job-1");
    expect(result.jobTitle).toBe("Senior Backend Engineer");
    expect(result.company).toBe("Northwind Cloud");
    expect(result.resumeTitle).toBe("Senior Engineer Resume");
    expect(result.scores).toEqual({ matchScore: 72, recommendation: "good match" });
    expect(result.body).not.toContain("SCORES:");
    expect(result.body).toContain("## Summary");
    expect(result.saved).toBe(true);
  });

  it("does not return the resume text or the job text to the model", async () => {
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(JSON.stringify(result)).not.toContain(RESUME_TEXT);
    expect(JSON.stringify(result)).not.toContain(JOB_TEXT);
  });

  it("saves the match itself, scoped to the job it scored", async () => {
    await execute(buildMatchJobTool(ctx()), {});
    expect(save).toHaveBeenCalledTimes(1);
    const [jobId, matchScore, payload] = save.mock.calls[0];
    expect(jobId).toBe("job-1");
    expect(matchScore).toBe(72);
    const data = JSON.parse(payload);
    expect(data.matchScore).toBe(72);
    expect(data.recommendation).toBe("good match");
    expect(data.body).toContain("## Summary");
    expect(data.resumeId).toBe("r9");
    expect(data.resumeTitle).toBe("Senior Engineer Resume");
    expect(data.provider).toBe("ollama");
    expect(data.model).toBe("qwen3.5:9b");
    expect(data.surface).toBe(APP_CONSTANTS.AGENT_CHAT_MATCH_SURFACE);
    expect(typeof data.matchedAt).toBe("string");
  });

  it("reports a save failure in the result instead of swallowing it", async () => {
    save.mockResolvedValue({ success: false, message: "Database is locked." });
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(result.status).toBe("ok");
    expect(result.saved).toBe(false);
    expect(result.saveError).toBe("Database is locked.");
  });

  // matchData is overwrite-only, so a half generation must never be written.
  it("fails and saves nothing when no scores line arrives", async () => {
    streamText.mockReturnValue(textStreamOf(["No scores here, just prose."]));
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(result.status).toBe("generation_failed");
    expect(save).not.toHaveBeenCalled();
  });

  it("saves nothing when the sub-call is aborted mid-stream", async () => {
    const abortError = Object.assign(new Error("This operation was aborted"), {
      name: "AbortError",
    });
    const rejected = Promise.reject(abortError);
    rejected.catch(() => {});
    streamText.mockReturnValue({
      textStream: (async function* () {
        yield "SCORES: match=72 recommendation=good\n\n## Summary\nCut off";
      })(),
      finishReason: rejected,
    });
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(result.status).toBe("generation_failed");
    expect(save).not.toHaveBeenCalled();
  });

  it.each(["other", "length"])(
    "saves nothing when the stream ends with finishReason %s",
    async (finishReason) => {
      streamText.mockReturnValue(
        textStreamOf(
          ["SCORES: match=72 recommendation=good\n\n## Summary\nCut off mid-"],
          finishReason,
        ),
      );
      const result = await execute(buildMatchJobTool(ctx()), {});
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
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(result.status).toBe("generation_failed");
    expect(JSON.stringify(result)).not.toContain("ECONNREFUSED");
    expect(save).not.toHaveBeenCalled();
  });

  it("passes needs_selection straight through without generating", async () => {
    findResume.mockResolvedValue({
      status: "needs_selection",
      resumes: [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
    });
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(result).toEqual({
      status: "needs_selection",
      resumes: [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
    });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns no_resumes without generating", async () => {
    findResume.mockResolvedValue({ status: "no_resumes" });
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(result).toEqual({ status: "no_resumes" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("says which document was unreadable when the job fails preprocessing", async () => {
    preJob.mockResolvedValue({
      success: false,
      error: { code: "TOO_SHORT", message: "Job description is too short" },
    });
    const result = await execute(buildMatchJobTool(ctx()), {});
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
    const result = await execute(buildMatchJobTool(ctx()), {});
    expect(result.status).toBe("unreadable");
    expect(result.what).toBe("resume");
    expect(result.title).toBe("Senior Engineer Resume");
    expect(streamText).not.toHaveBeenCalled();
  });
});
