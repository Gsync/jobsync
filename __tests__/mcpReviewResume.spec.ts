import { handleReviewResume } from "@/lib/mcp/tools/reviewResume";
import { getDefaultResumeForUser } from "@/lib/jobs/getDefaultResumeForUser";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { APP_CONSTANTS } from "@/lib/constants";

vi.mock("@/lib/jobs/getDefaultResumeForUser", () => ({
  getDefaultResumeForUser: vi.fn(),
}));

vi.mock("@/lib/ai/tools/preprocessing", () => ({
  preprocessResume: vi.fn(),
}));

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const longResumeText = "a".repeat(APP_CONSTANTS.MCP_REVIEW_MIN_RESUME_LENGTH);
const shortResumeText = "too short";

describe("handleReviewResume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a directive containing resume text + resumeId + save instruction on the happy path", async () => {
    (getDefaultResumeForUser as any).mockResolvedValue({ id: "resume-1" });
    (preprocessResume as any).mockResolvedValue({
      success: true,
      data: { normalizedText: longResumeText, metadata: {}, isValid: true },
    });

    const result = await handleReviewResume("user-1");
    const text = result.content[0].text;

    expect(text).toContain(longResumeText);
    expect(text).toContain("resume-1");
    expect(text).toContain("save_resume_review");
    expect(text).toContain(
      "SCORES: overall=<0-100> impact=<0-100> clarity=<0-100> ats=<0-100>",
    );
    expect(text).toContain('"resumeId": "resume-1"');
  });

  it("returns a note when no default resume is set", async () => {
    (getDefaultResumeForUser as any).mockResolvedValue(null);

    const result = await handleReviewResume("user-2");
    const text = result.content[0].text;

    expect(text).toContain("No default resume set");
    expect(text).not.toContain("save_resume_review");
    expect(preprocessResume).not.toHaveBeenCalled();
  });

  it("returns a distinct note when preprocessing fails", async () => {
    (getDefaultResumeForUser as any).mockResolvedValue({ id: "resume-1" });
    (preprocessResume as any).mockResolvedValue({
      success: false,
      error: { code: "TOO_SHORT", message: "Resume is too short" },
    });

    const result = await handleReviewResume("user-3");
    const text = result.content[0].text;

    expect(text).toContain("couldn't be used for review");
    expect(text).not.toContain("No default resume set");
    expect(text).not.toContain("save_resume_review");
  });

  it("returns a too-short note when normalized text is under the length threshold", async () => {
    (getDefaultResumeForUser as any).mockResolvedValue({ id: "resume-1" });
    (preprocessResume as any).mockResolvedValue({
      success: true,
      data: { normalizedText: shortResumeText, metadata: {}, isValid: true },
    });

    const result = await handleReviewResume("user-4");
    const text = result.content[0].text;

    expect(text).toBe("Resume too short to review.");
    expect(text).not.toContain("save_resume_review");
  });

  it("returns a rate-limit message and never loads a resume when the limit is exceeded", async () => {
    (checkMcpRateLimit as any).mockReturnValueOnce({
      allowed: false,
      resetIn: 60000,
    });

    const result = await handleReviewResume("user-5");
    const text = result.content[0].text;

    expect(text).toContain("Rate limit exceeded");
    expect(text).toContain("60s");
    expect(getDefaultResumeForUser).not.toHaveBeenCalled();
  });
});
