import { handleAddJob } from "@/lib/mcp/tools/addJob";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { updateJobFromNames } from "@/lib/jobs/updateJobFromNames";
import { getDefaultResumeForUser } from "@/lib/jobs/getDefaultResumeForUser";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

vi.mock("@/lib/jobs/createJobFromNames", () => ({
  createJobFromNames: vi.fn(),
}));

vi.mock("@/lib/jobs/updateJobFromNames", () => ({
  updateJobFromNames: vi.fn(),
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

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
const fullDescription = words(200);
const partialDescription = words(60);
const stubDescription = "Frontend Developer, $120k, Remote.";

const baseInput = {
  company: "Acme",
  jobTitle: "Engineer",
  jobDescription: fullDescription,
};

function mockCreated(completeness: string) {
  (createJobFromNames as any).mockResolvedValue({
    created: true,
    jobId: "job-1",
    resolutions: [],
    descriptionCompleteness: completeness,
    message: "Created Acme; Created Engineer. Job created (id: job-1).",
  });
}

function mockUsableResume() {
  (getDefaultResumeForUser as any).mockResolvedValue({
    id: "resume-1",
    title: "My Resume",
  });
  (preprocessResume as any).mockResolvedValue({
    success: true,
    data: { normalizedText: "NORMALIZED RESUME TEXT", metadata: {}, isValid: true },
  });
}

describe("handleAddJob match gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({ allowed: true, resetIn: 0 });
  });

  it("issues the full directive for a full description with a usable resume", async () => {
    mockCreated("full");
    mockUsableResume();

    const result = await handleAddJob(baseInput as any, "user-1", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("Job created (id: job-1)");
    expect(text).toContain("NORMALIZED RESUME TEXT");
    expect(text).toContain("save_match_result");
    expect(text).toContain(
      "SCORES: match=<0-100> recommendation=<strong|good|partial|weak>",
    );
    expect(text).toContain("## Overall Fit");
    expect(text).toContain("## Key Strengths");
    expect(text).toContain("## Gaps / Risks");
    expect(text).toContain("## Recommendation");
    expect(text).toContain('"resumeId": "resume-1"');
    expect(text).not.toContain("PARTIAL DESCRIPTION WARNING");
  });

  it("issues a directive WITH a provisional warning for a partial description", async () => {
    mockCreated("partial");
    mockUsableResume();

    const result = await handleAddJob(
      { ...baseInput, jobDescription: partialDescription } as any,
      "user-1",
      "my-token",
    );
    const text = result.content[0].text;

    expect(text).toContain("save_match_result");
    expect(text).toContain("PARTIAL DESCRIPTION WARNING");
    expect(text).toContain("update_job");
  });

  it("refuses to offer a match for a title-only description", async () => {
    mockCreated("title-only");

    const result = await handleAddJob(
      { ...baseInput, jobDescription: stubDescription } as any,
      "user-1",
      "my-token",
    );
    const text = result.content[0].text;

    expect(text).toContain("Job created (id: job-1)");
    expect(text).toContain("too thin to score");
    expect(text).toContain("update_job");
    expect(text).not.toContain("save_match_result");
    expect(getDefaultResumeForUser).not.toHaveBeenCalled();
  });

  it("notes a missing default resume and still reports the job as created", async () => {
    mockCreated("full");
    (getDefaultResumeForUser as any).mockResolvedValue(null);

    const result = await handleAddJob(baseInput as any, "user-1", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("Job created (id: job-1)");
    expect(text).toContain("No default resume set");
    expect(text).not.toContain("save_match_result");
  });

  it("notes an unusable default resume", async () => {
    mockCreated("full");
    (getDefaultResumeForUser as any).mockResolvedValue({ id: "resume-1" });
    (preprocessResume as any).mockResolvedValue({ success: false });

    const result = await handleAddJob(baseInput as any, "user-1", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("couldn't be used for matching");
    expect(text).not.toContain("save_match_result");
  });

  it("returns the duplicate message with no match offer", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: false,
      duplicateOf: { id: "job-9", title: "Engineer", company: "Acme" },
      resolutions: [],
      message: 'Duplicate detected — existing job "Engineer" at "Acme" (id: job-9).',
    });

    const result = await handleAddJob(baseInput as any, "user-1", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("Duplicate detected");
    expect(text).not.toContain("save_match_result");
    expect(getDefaultResumeForUser).not.toHaveBeenCalled();
  });

  it("short-circuits when rate limited", async () => {
    (checkMcpRateLimit as any).mockReturnValue({ allowed: false, resetIn: 5000 });

    const result = await handleAddJob(baseInput as any, "user-1", "my-token");

    expect(result.content[0].text).toContain("Rate limit exceeded");
    expect(createJobFromNames).not.toHaveBeenCalled();
  });
});

describe("handleAddJob upsert routing", () => {
  const duplicateResult = {
    created: false,
    duplicateOf: { id: "job-9", title: "Engineer", company: "Acme" },
    resolutions: [],
    message: 'Duplicate detected — existing job "Engineer" at "Acme" (id: job-9).',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({ allowed: true, resetIn: 0 });
  });

  it("updates the existing job instead of duplicating when upsert is true", async () => {
    (createJobFromNames as any).mockResolvedValue(duplicateResult);
    (updateJobFromNames as any).mockResolvedValue({
      updated: true,
      jobId: "job-9",
      descriptionChanged: true,
      descriptionCompleteness: "full",
      resolutions: [],
      message: "Job job-9 updated. Fields changed: description.",
    });
    mockUsableResume();

    const result = await handleAddJob(
      { ...baseInput, upsert: true } as any,
      "user-1",
      "my-token",
    );
    const text = result.content[0].text;

    expect(updateJobFromNames).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-9", jobDescription: fullDescription }),
      "user-1",
    );
    expect(text).toContain("Job job-9 updated");
    expect(text).toContain("save_match_result");
    expect(text).not.toContain("Duplicate detected");
  });

  it("does not pass add-only fields through to the update", async () => {
    (createJobFromNames as any).mockResolvedValue(duplicateResult);
    (updateJobFromNames as any).mockResolvedValue({
      updated: true,
      jobId: "job-9",
      descriptionChanged: false,
      descriptionCompleteness: "full",
      resolutions: [],
      message: "Job job-9 updated.",
    });

    await handleAddJob(
      { ...baseInput, upsert: true, allowDuplicate: false } as any,
      "user-1",
      "my-token",
    );

    const passed = (updateJobFromNames as any).mock.calls[0][0];
    expect(passed).not.toHaveProperty("upsert");
    expect(passed).not.toHaveProperty("allowDuplicate");
    expect(passed).not.toHaveProperty("createdVia");
  });

  it("reports the duplicate normally when upsert is not set", async () => {
    (createJobFromNames as any).mockResolvedValue(duplicateResult);

    const result = await handleAddJob(baseInput as any, "user-1", "my-token");

    expect(updateJobFromNames).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain("Duplicate detected");
  });

  it("explains when the duplicate is a web-app job that MCP cannot update", async () => {
    (createJobFromNames as any).mockResolvedValue(duplicateResult);
    (updateJobFromNames as any).mockResolvedValue({
      updated: false,
      jobId: "job-9",
      descriptionChanged: false,
      descriptionCompleteness: null,
      resolutions: [],
      message: "Job not found, not owned by this token's user, or not eligible",
    });

    const result = await handleAddJob(
      { ...baseInput, upsert: true } as any,
      "user-1",
      "my-token",
    );

    expect(result.content[0].text).toContain("not eligible");
  });
});
