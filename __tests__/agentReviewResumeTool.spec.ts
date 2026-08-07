import { buildReviewResumeTool } from "@/lib/agent/tools/reviewResume";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { saveResumeReviewResult } from "@/actions/profile.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { TEMPERATURES } from "@/lib/ai/config";
import {
  RESUME_REVIEW_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
} from "@/lib/ai/prompts/resume-review";

vi.mock("@/lib/agent/resumeLookup", () => ({ resolveResumeForAgent: vi.fn() }));
vi.mock("@/lib/ai/tools/preprocessing", () => ({ preprocessResume: vi.fn() }));
vi.mock("@/actions/profile.actions", () => ({
  saveResumeReviewResult: vi.fn(),
}));

const streamText = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, streamText: (...args: unknown[]) => streamText(...(args as [])) };
});

const resolve = resolveResumeForAgent as unknown as ReturnType<typeof vi.fn>;
const preprocess = preprocessResume as unknown as ReturnType<typeof vi.fn>;
const save = saveResumeReviewResult as unknown as ReturnType<typeof vi.fn>;

const REVIEW =
  "SCORES: overall=78 impact=72 clarity=81 ats=69\n\n## Summary\n\nSolid resume.";

// A resume long enough that the old 12k get_resume ceiling would have cut it.
const LONG_RESUME = "R".repeat(APP_CONSTANTS.AGENT_CHAT_RESUME_MAX_CHARS + 5_000);

function textStreamOf(chunks: string[]) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
    })(),
  };
}

const writer = { write: vi.fn(), merge: vi.fn(), onError: undefined };

const ctx = () => ({
  userId: "session-user",
  pageResumeId: "page-resume",
  model: { id: "fake-model" } as any,
  provider: "ollama",
  modelName: "qwen3.5:9b",
  writer: writer as any,
});

const execute = (agentTool: any, input: any) =>
  agentTool.execute(input, { toolCallId: "call-1", messages: [] });

describe("review_resume agent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolve.mockResolvedValue({
      status: "ok",
      resume: { id: "r1", title: "Senior Engineer Resume" },
      source: "default",
      ambiguousTitle: false,
    });
    preprocess.mockResolvedValue({
      success: true,
      data: { normalizedText: LONG_RESUME, metadata: {}, isValid: true },
    });
    streamText.mockReturnValue(textStreamOf([REVIEW]));
    save.mockResolvedValue({ success: true });
  });

  // The gate exists to stop unseen writes. This writes only to the caller's
  // own reviewData, and they watch it stream.
  it("has no approval gate", () => {
    expect(buildReviewResumeTool(ctx()).needsApproval).toBeUndefined();
  });

  it("is registered in the tool registry", async () => {
    const { buildAgentTools } = await import("@/lib/agent/tools");
    const tools = buildAgentTools(ctx());
    expect(Object.keys(tools)).toContain("review_resume");
  });

  it("passes the SESSION userId, never one supplied by the model", async () => {
    await execute(buildReviewResumeTool(ctx()), { userId: "attacker-user" });
    expect(resolve).toHaveBeenCalledWith("session-user", expect.anything());
  });

  it("ignores a resumeId the model invents and forwards only the title", async () => {
    await execute(buildReviewResumeTool(ctx()), {
      resumeId: "someone-elses-resume",
      resumeTitle: "Senior Engineer Resume",
    });
    expect(resolve).toHaveBeenCalledWith("session-user", {
      title: "Senior Engineer Resume",
      pageResumeId: "page-resume",
    });
  });

  // Parity, asserted on the exact five inputs the dedicated route uses.
  it("generates with the dedicated route's prompt, temperature and context", async () => {
    await execute(buildReviewResumeTool(ctx()), {});
    const args = streamText.mock.calls[0][0];
    expect(args.system).toBe(RESUME_REVIEW_SYSTEM_PROMPT);
    expect(args.prompt).toBe(buildResumeReviewPrompt(LONG_RESUME));
    expect(args.temperature).toBe(TEMPERATURES.FEEDBACK);
    expect(args.providerOptions.ollama.options.num_ctx).toBe(
      APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
    );
    expect(args.abortSignal).toBeDefined();
  });

  it("sends the resume untruncated, unlike get_resume", async () => {
    await execute(buildReviewResumeTool(ctx()), {});
    expect(streamText.mock.calls[0][0].prompt).toContain(LONG_RESUME);
  });

  it("streams the sub-call's tokens as transient parts keyed by the tool call", async () => {
    streamText.mockReturnValue(textStreamOf(["SCORES: ", "overall=78 ", "impact=72 clarity=81 ats=69\n\nBody"]));
    await execute(buildReviewResumeTool(ctx()), {});
    expect(writer.write).toHaveBeenCalledTimes(3);
    const first = writer.write.mock.calls[0][0];
    expect(first.type).toBe("data-review");
    expect(first.id).toBe("call-1");
    expect(first.transient).toBe(true);
    expect(
      writer.write.mock.calls.map((c: any[]) => c[0].data.delta).join(""),
    ).toContain("SCORES: overall=78");
  });

  it("returns scores and the markdown body, with the scores line stripped", async () => {
    const result = await execute(buildReviewResumeTool(ctx()), {});
    expect(result.status).toBe("ok");
    expect(result.resumeId).toBe("r1");
    expect(result.title).toBe("Senior Engineer Resume");
    expect(result.scores).toEqual({
      overall: 78,
      impact: 72,
      clarity: 81,
      atsCompatibility: 69,
    });
    expect(result.body).not.toContain("SCORES:");
    expect(result.body).toContain("## Summary");
    expect(result.saved).toBe(true);
  });

  it("does not return the resume text to the model", async () => {
    const result = await execute(buildReviewResumeTool(ctx()), {});
    expect(JSON.stringify(result)).not.toContain(LONG_RESUME);
  });

  it("saves the review itself, scoped to the resume it reviewed", async () => {
    await execute(buildReviewResumeTool(ctx()), {});
    expect(save).toHaveBeenCalledTimes(1);
    const [resumeId, payload] = save.mock.calls[0];
    expect(resumeId).toBe("r1");
    const data = JSON.parse(payload);
    expect(data.overall).toBe(78);
    expect(data.atsCompatibility).toBe(69);
    expect(data.body).toContain("## Summary");
    expect(data.provider).toBe("ollama");
    expect(data.model).toBe("qwen3.5:9b");
    expect(data.surface).toBe(APP_CONSTANTS.AGENT_CHAT_REVIEW_SURFACE);
    expect(typeof data.reviewedAt).toBe("string");
  });

  it("reports a save failure in the result instead of swallowing it", async () => {
    save.mockResolvedValue({ success: false, message: "Database is locked." });
    const result = await execute(buildReviewResumeTool(ctx()), {});
    expect(result.status).toBe("ok");
    expect(result.saved).toBe(false);
    expect(result.saveError).toBe("Database is locked.");
  });

  // A half review must never be saved: reviewData is overwrite-only.
  it("fails the generation and saves nothing when no scores line arrives", async () => {
    streamText.mockReturnValue(textStreamOf(["No scores here, just prose."]));
    const result = await execute(buildReviewResumeTool(ctx()), {});
    expect(result.status).toBe("generation_failed");
    expect(save).not.toHaveBeenCalled();
  });

  it("returns generation_failed rather than throwing when the sub-call errors", async () => {
    streamText.mockReturnValue({
      textStream: (async function* () {
        throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
      })(),
    });
    const result = await execute(buildReviewResumeTool(ctx()), {});
    expect(result.status).toBe("generation_failed");
    expect(JSON.stringify(result)).not.toContain("ECONNREFUSED");
    expect(save).not.toHaveBeenCalled();
  });

  it("passes needs_selection straight through without generating", async () => {
    resolve.mockResolvedValue({
      status: "needs_selection",
      resumes: [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
    });
    const result = await execute(buildReviewResumeTool(ctx()), {});
    expect(result).toEqual({
      status: "needs_selection",
      resumes: [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
    });
    expect(streamText).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("returns no_resumes without generating", async () => {
    resolve.mockResolvedValue({ status: "no_resumes" });
    const result = await execute(buildReviewResumeTool(ctx()), {});
    expect(result).toEqual({ status: "no_resumes" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns unreadable when preprocessing fails", async () => {
    preprocess.mockResolvedValue({
      success: false,
      error: { code: "TOO_SHORT", message: "Resume is too short" },
    });
    const result = await execute(buildReviewResumeTool(ctx()), {});
    expect(result.status).toBe("unreadable");
    expect(result.title).toBe("Senior Engineer Resume");
    expect(streamText).not.toHaveBeenCalled();
  });
});
