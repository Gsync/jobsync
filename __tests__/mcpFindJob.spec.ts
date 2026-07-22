import { handleFindJob } from "@/lib/mcp/tools/findJob";
import { findExistingJobByUrl } from "@/lib/jobs/jobDedupe";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = { job: { findFirst: vi.fn() } };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/jobs/jobDedupe", () => ({
  findExistingJobByUrl: vi.fn(),
}));

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const url = "https://example.com/jobs/1";

describe("handleFindJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({ allowed: true, resetIn: 0 });
  });

  it("reports no match when nothing exists for the URL", async () => {
    (findExistingJobByUrl as any).mockResolvedValue(null);

    const result = await handleFindJob({ jobUrl: url }, "user-1");

    expect(result.content[0].text).toContain("No saved job matches that URL");
    expect(result.content[0].text).toContain("add_job");
  });

  it("returns the existing job id, status, completeness and current tags", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({
      id: "job-1",
      title: "Engineer",
      company: "Acme",
    });
    (prisma.job.findFirst as any).mockResolvedValue({
      id: "job-1",
      descriptionCompleteness: "title-only",
      matchScore: null,
      createdVia: "my-token",
      Status: { value: "draft" },
      tags: [{ label: "React" }, { label: "Remote" }],
    });

    const result = await handleFindJob({ jobUrl: url }, "user-1");
    const text = result.content[0].text;

    expect(text).toContain("job-1");
    expect(text).toContain("Engineer");
    expect(text).toContain("Acme");
    expect(text).toContain("draft");
    expect(text).toContain("title-only");
    expect(text).toContain("React, Remote");
    expect(text).toContain("update_job");
    // Tags are replaced wholesale by update_job, so an agent that doesn't
    // see the current list here would silently wipe it out.
    expect(text).toContain("replaced wholesale");
  });

  it("reports 'none' when the existing job has no tags", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({
      id: "job-1",
      title: "Engineer",
      company: "Acme",
    });
    (prisma.job.findFirst as any).mockResolvedValue({
      id: "job-1",
      descriptionCompleteness: "full",
      matchScore: 80,
      createdVia: "my-token",
      Status: { value: "applied" },
      tags: [],
    });

    const result = await handleFindJob({ jobUrl: url }, "user-1");
    expect(result.content[0].text).toContain("tags: none");
  });

  it("scopes the detail lookup to the caller", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({
      id: "job-1",
      title: "Engineer",
      company: "Acme",
    });
    (prisma.job.findFirst as any).mockResolvedValue(null);

    await handleFindJob({ jobUrl: url }, "user-1");

    expect(prisma.job.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1", userId: "user-1" },
      }),
    );
  });

  it("says the job is not MCP-updatable when createdVia is null", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({
      id: "job-1",
      title: "Engineer",
      company: "Acme",
    });
    (prisma.job.findFirst as any).mockResolvedValue({
      id: "job-1",
      descriptionCompleteness: null,
      matchScore: 70,
      createdVia: null,
      Status: { value: "applied" },
      tags: [],
    });

    const result = await handleFindJob({ jobUrl: url }, "user-1");

    expect(result.content[0].text).toContain("cannot be updated via MCP");
  });

  it("short-circuits when rate limited", async () => {
    (checkMcpRateLimit as any).mockReturnValue({ allowed: false, resetIn: 3000 });

    const result = await handleFindJob({ jobUrl: url }, "user-1");

    expect(result.content[0].text).toContain("Rate limit exceeded");
    expect(findExistingJobByUrl).not.toHaveBeenCalled();
  });
});
