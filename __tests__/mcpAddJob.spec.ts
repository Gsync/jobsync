import { handleAddJob } from "@/lib/mcp/tools/addJob";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { getDefaultResumeForUser } from "@/lib/jobs/getDefaultResumeForUser";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

vi.mock("@/lib/jobs/createJobFromNames", () => ({
  createJobFromNames: vi.fn(),
}));

vi.mock("@/lib/jobs/getDefaultResumeForUser", () => ({
  getDefaultResumeForUser: vi.fn(),
}));

vi.mock("@/lib/ai/tools/preprocessing", () => ({
  preprocessResume: vi.fn(),
}));

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const longDescription = "a".repeat(250);
const shortDescription = "Short JD.";

const baseInput = {
  company: "Acme",
  jobTitle: "Engineer",
  jobDescription: longDescription,
};

describe("handleAddJob match gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends resume text + save_match_result directive when created + substantive + default resume usable", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: true,
      jobId: "job-1",
      resolutions: [],
      message: "Created Acme; Created Engineer. Job created (id: job-1).",
    });
    (getDefaultResumeForUser as any).mockResolvedValue({ id: "resume-1", title: "My Resume" });
    (preprocessResume as any).mockResolvedValue({
      success: true,
      data: { normalizedText: "NORMALIZED RESUME TEXT", metadata: {}, isValid: true },
    });

    const result = await handleAddJob(baseInput as any, "user-1", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("Job created (id: job-1)");
    expect(text).toContain("NORMALIZED RESUME TEXT");
    expect(text).toContain("job-1");
    expect(text).toContain("save_match_result");
    expect(text).toContain("SCORES: match=<0-100> recommendation=<strong|good|partial|weak>");
    // Directive requests the four structured sections (richer match body).
    expect(text).toContain("## Overall Fit");
    expect(text).toContain("## Key Strengths");
    expect(text).toContain("## Gaps / Risks");
    expect(text).toContain("## Recommendation");
    // Directive threads the resumeId back for save_match_result provenance.
    expect(text).toContain('"resumeId": "resume-1"');
  });

  it("adds a short-description note and no directive when description is under the threshold", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: true,
      jobId: "job-1",
      resolutions: [],
      message: "Created Acme; Created Engineer. Job created (id: job-1).",
    });

    const result = await handleAddJob(
      { ...baseInput, jobDescription: shortDescription } as any,
      "user-2",
      "my-token",
    );
    const text = result.content[0].text;

    expect(text).toContain("Description too short to match");
    expect(text).not.toContain("save_match_result");
    expect(getDefaultResumeForUser).not.toHaveBeenCalled();
  });

  it("adds an actionable note when no default resume is set", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: true,
      jobId: "job-1",
      resolutions: [],
      message: "Created Acme; Created Engineer. Job created (id: job-1).",
    });
    (getDefaultResumeForUser as any).mockResolvedValue(null);

    const result = await handleAddJob(baseInput as any, "user-3", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("No default resume set");
    expect(text).not.toContain("save_match_result");
    expect(preprocessResume).not.toHaveBeenCalled();
  });

  it("adds a distinct note when the default resume exists but fails preprocessing", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: true,
      jobId: "job-1",
      resolutions: [],
      message: "Created Acme; Created Engineer. Job created (id: job-1).",
    });
    (getDefaultResumeForUser as any).mockResolvedValue({ id: "resume-1", title: "My Resume" });
    (preprocessResume as any).mockResolvedValue({
      success: false,
      error: { code: "TOO_SHORT", message: "Resume is too short" },
    });

    const result = await handleAddJob(baseInput as any, "user-4", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("Default resume couldn't be used for matching");
    expect(text).not.toContain("No default resume set");
    expect(text).not.toContain("save_match_result");
  });

  it("does not offer a match on a duplicate, and explains why", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: false,
      duplicateOf: { id: "job-existing", title: "Engineer", company: "Acme" },
      resolutions: [],
      message: 'Duplicate detected — existing job "Engineer" at "Acme" (id: job-existing).',
    });

    const result = await handleAddJob(baseInput as any, "user-5", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("Duplicate detected");
    expect(text).toContain("No match offered for duplicates");
    expect(getDefaultResumeForUser).not.toHaveBeenCalled();
    expect(preprocessResume).not.toHaveBeenCalled();
  });

  it("returns a rate-limit message and never creates a job when the limit is exceeded", async () => {
    (checkMcpRateLimit as any).mockReturnValueOnce({
      allowed: false,
      resetIn: 60000,
    });

    const result = await handleAddJob(baseInput as any, "user-6", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("Rate limit exceeded");
    expect(text).toContain("60s");
    expect(createJobFromNames).not.toHaveBeenCalled();
  });
});
