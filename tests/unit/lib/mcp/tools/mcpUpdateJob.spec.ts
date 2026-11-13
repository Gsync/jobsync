import { handleUpdateJob } from "@/lib/mcp/tools/updateJob";
import { updateJobFromNames } from "@/lib/jobs/updateJobFromNames";
import { buildMatchOffer } from "@/lib/mcp/tools/matchDirective";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

vi.mock("@/lib/jobs/updateJobFromNames", () => ({
  updateJobFromNames: vi.fn(),
}));

vi.mock("@/lib/mcp/tools/matchDirective", async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, buildMatchOffer: vi.fn() };
});

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

describe("handleUpdateJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({ allowed: true, resetIn: 0 });
    (buildMatchOffer as any).mockResolvedValue({
      kind: "directive",
      text: "DIRECTIVE calling save_match_result",
    });
  });

  it("re-offers a match when the description was enriched to full", async () => {
    (updateJobFromNames as any).mockResolvedValue({
      updated: true,
      jobId: "job-1",
      descriptionChanged: true,
      descriptionCompleteness: "full",
      resolutions: [],
      message: "Job job-1 updated. Fields changed: description.",
    });

    const result = await handleUpdateJob(
      { jobId: "job-1", jobDescription: "x".repeat(50) } as any,
      "user-1",
    );
    const text = result.content[0].text;

    expect(text).toContain("Job job-1 updated");
    expect(text).toContain("DIRECTIVE calling save_match_result");
    expect(buildMatchOffer).toHaveBeenCalledWith("job-1", "user-1", "full", "update");
  });

  it("does not re-offer a match when the description was not touched", async () => {
    (updateJobFromNames as any).mockResolvedValue({
      updated: true,
      jobId: "job-1",
      descriptionChanged: false,
      descriptionCompleteness: "full",
      resolutions: [],
      message: "Job job-1 updated. Fields changed: statusId.",
    });

    const result = await handleUpdateJob(
      { jobId: "job-1", status: "applied" } as any,
      "user-1",
    );

    expect(result.content[0].text).toBe("Job job-1 updated. Fields changed: statusId.");
    expect(buildMatchOffer).not.toHaveBeenCalled();
  });

  it("returns the helper's message unchanged when the update failed", async () => {
    (updateJobFromNames as any).mockResolvedValue({
      updated: false,
      jobId: "job-x",
      descriptionChanged: false,
      descriptionCompleteness: null,
      resolutions: [],
      message: "Job not found, not owned by this token's user, or not eligible",
    });

    const result = await handleUpdateJob(
      { jobId: "job-x", salaryRange: "$1" } as any,
      "user-1",
    );

    expect(result.content[0].text).toContain("not found");
    expect(buildMatchOffer).not.toHaveBeenCalled();
  });

  it("surfaces resolver errors as an Error: message", async () => {
    (updateJobFromNames as any).mockRejectedValue(
      new Error('Invalid jobType "Freelance". Valid values: Full-time, Part-time, Contract'),
    );

    const result = await handleUpdateJob(
      { jobId: "job-1", jobType: "Freelance" } as any,
      "user-1",
    );

    expect(result.content[0].text).toContain("Invalid jobType");
  });

  it("short-circuits when rate limited", async () => {
    (checkMcpRateLimit as any).mockReturnValue({ allowed: false, resetIn: 7000 });

    const result = await handleUpdateJob({ jobId: "job-1" } as any, "user-1");

    expect(result.content[0].text).toContain("Rate limit exceeded");
    expect(updateJobFromNames).not.toHaveBeenCalled();
  });
});
