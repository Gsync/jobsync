import { buildGetResumeTool } from "@/lib/agent/tools/getResume";
import { buildAgentTools } from "@/lib/agent/tools";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { APP_CONSTANTS } from "@/lib/constants";

vi.mock("@/lib/agent/resumeLookup", () => ({ resolveResumeForAgent: vi.fn() }));
vi.mock("@/lib/ai/tools/preprocessing", () => ({ preprocessResume: vi.fn() }));

const resolve = resolveResumeForAgent as unknown as ReturnType<typeof vi.fn>;
const preprocess = preprocessResume as unknown as ReturnType<typeof vi.fn>;

const resume = { id: "r1", title: "Senior Engineer Resume" };
const execute = (tool: any, input: any) =>
  tool.execute(input, { toolCallId: "c", messages: [] });

describe("get_resume agent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolve.mockResolvedValue({ status: "ok", resume, source: "default", ambiguousTitle: false });
    preprocess.mockResolvedValue({
      success: true,
      data: { normalizedText: "RESUME TEXT", metadata: {}, isValid: true },
    });
  });

  // A read of the user's own data, shown only to that user. The gate exists
  // to stop unseen writes; there is no write here.
  it("has no approval gate", () => {
    expect(buildGetResumeTool("user-1").needsApproval).toBeUndefined();
  });

  it("is registered in the tool registry", () => {
    const tools = buildAgentTools({ userId: "user-1" });
    expect(Object.keys(tools)).toContain("get_resume");
  });

  it("passes the SESSION userId, never one supplied by the model", async () => {
    await execute(buildGetResumeTool("session-user"), { userId: "attacker-user" });
    expect(resolve).toHaveBeenCalledWith("session-user", expect.anything());
  });

  it("ignores a resumeId the model invents and forwards only the title", async () => {
    await execute(buildGetResumeTool("user-1", "page-resume"), {
      resumeTitle: "Senior Engineer Resume",
      resumeId: "someone-elses-resume",
    });
    expect(resolve).toHaveBeenCalledWith("user-1", {
      title: "Senior Engineer Resume",
      pageResumeId: "page-resume",
    });
  });

  it("returns the preprocessed text with identifying metadata", async () => {
    const result: any = await execute(buildGetResumeTool("user-1"), {});
    expect(result).toMatchObject({
      status: "ok",
      resumeId: "r1",
      title: "Senior Engineer Resume",
      resumeText: "RESUME TEXT",
      chars: "RESUME TEXT".length,
      truncated: false,
      source: "default",
    });
  });

  it("truncates past the char ceiling and says so", async () => {
    const long = "x".repeat(APP_CONSTANTS.AGENT_CHAT_RESUME_MAX_CHARS + 500);
    preprocess.mockResolvedValue({
      success: true,
      data: { normalizedText: long, metadata: {}, isValid: true },
    });
    const result: any = await execute(buildGetResumeTool("user-1"), {});
    expect(result.resumeText).toHaveLength(APP_CONSTANTS.AGENT_CHAT_RESUME_MAX_CHARS);
    expect(result.truncated).toBe(true);
  });

  it("never returns the saved review alongside the text", async () => {
    resolve.mockResolvedValue({
      status: "ok",
      resume: { ...resume, reviewData: '{"overall":62}' },
      source: "default",
      ambiguousTitle: false,
    });
    const result: any = await execute(buildGetResumeTool("user-1"), {});
    expect(JSON.stringify(result)).not.toContain("62");
  });

  it("passes needs_selection through with the titles", async () => {
    resolve.mockResolvedValue({
      status: "needs_selection",
      resumes: [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
    });
    const result: any = await execute(buildGetResumeTool("user-1"), {});
    expect(result.status).toBe("needs_selection");
    expect(result.resumes).toHaveLength(2);
  });

  it("reports no resumes rather than inventing one", async () => {
    resolve.mockResolvedValue({ status: "no_resumes" });
    const result: any = await execute(buildGetResumeTool("user-1"), {});
    expect(result).toEqual({ status: "no_resumes" });
  });

  it("reports an unreadable resume instead of throwing", async () => {
    preprocess.mockResolvedValue({
      success: false,
      error: { code: "TOO_SHORT", message: "Resume is too short" },
    });
    const result: any = await execute(buildGetResumeTool("user-1"), {});
    expect(result.status).toBe("unreadable");
    expect(result.title).toBe("Senior Engineer Resume");
  });

  it("returns unreadable rather than throwing when the lookup blows up", async () => {
    resolve.mockRejectedValue(new Error("db down"));
    const result: any = await execute(buildGetResumeTool("user-1"), {});
    expect(result.status).toBe("unreadable");
  });
});
