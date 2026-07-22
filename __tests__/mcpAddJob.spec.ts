import { handleAddJob } from "@/lib/mcp/tools/addJob";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

vi.mock("@/lib/jobs/createJobFromNames", () => ({
  createJobFromNames: vi.fn(),
}));

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const baseInput = {
  company: "Acme",
  jobTitle: "Engineer",
  jobDescription: "A substantive fictional description ".repeat(10),
  autoMatch: false,
};

describe("handleAddJob privacy boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a job without returning default resume content", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: true,
      jobId: "job-1",
      resolutions: [],
      message: "Created Acme; Created Engineer. Job created (id: job-1).",
    });

    const result = await handleAddJob(baseInput, "user-1", "my-token");
    const text = result.content[0].text;

    expect(text).toContain("Job created (id: job-1)");
    expect(text).not.toContain("DEFAULT RESUME");
    expect(text).not.toContain("save_match_result");
    expect(result.structuredContent).toEqual({
      created: true,
      jobId: "job-1",
      duplicateJobId: null,
      autoMatchPerformed: false,
    });
  });

  it("keeps autoMatch fail-closed without disclosing a resume", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: true,
      jobId: "job-1",
      resolutions: [],
      message: "Job created (id: job-1).",
    });

    const result = await handleAddJob(
      { ...baseInput, autoMatch: true },
      "user-1",
      "my-token",
    );

    expect(result.content[0].text).toContain("Automatic MCP matching is disabled");
    expect(result.content[0].text).not.toContain("DEFAULT RESUME");
    expect(result.structuredContent.autoMatchPerformed).toBe(false);
  });

  it("returns a structured duplicate identifier", async () => {
    (createJobFromNames as any).mockResolvedValue({
      created: false,
      duplicateOf: { id: "job-existing", title: "Engineer", company: "Acme" },
      resolutions: [],
      message: "Duplicate detected.",
    });

    const result = await handleAddJob(baseInput, "user-1", "my-token");

    expect(result.structuredContent).toMatchObject({
      created: false,
      duplicateJobId: "job-existing",
    });
  });

  it("returns a structured rate-limit error without creating a job", async () => {
    (checkMcpRateLimit as any).mockReturnValueOnce({
      allowed: false,
      resetIn: 60_000,
    });

    const result = await handleAddJob(baseInput, "user-1", "my-token");

    expect(result.content[0].text).toContain("Rate limit exceeded");
    expect(result.structuredContent.created).toBe(false);
    expect(createJobFromNames).not.toHaveBeenCalled();
  });
});
