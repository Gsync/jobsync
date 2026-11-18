import { handleFindJob } from "@/lib/mcp/tools/findJob";
import { findExistingJobByUrl, findJobIdsByNames } from "@/lib/jobs/jobDedupe";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { McpFindJobSchema } from "@/models/mcp.schema";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient({} as never);

vi.mock("@/generated/prisma/client", () => {
  const mPrismaClient = { job: { findMany: vi.fn() } };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/jobs/jobDedupe", () => ({
  findExistingJobByUrl: vi.fn(),
  findJobIdsByNames: vi.fn(),
}));

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const url = "https://example.com/jobs/1";

function detailRow(over: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    jobUrl: url,
    createdAt: new Date("2026-09-18T10:00:00Z"),
    descriptionCompleteness: "title-only",
    matchScore: null,
    createdVia: "my-token",
    Status: { value: "draft" },
    JobTitle: { label: "Engineer" },
    Company: { label: "Acme" },
    Location: { label: "Vancouver, BC" },
    tags: [{ label: "React" }, { label: "Remote" }],
    ...over,
  };
}

describe("handleFindJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({ allowed: true, resetIn: 0 });
    (findExistingJobByUrl as any).mockResolvedValue(null);
    (findJobIdsByNames as any).mockResolvedValue([]);
  });

  it("reports no match when nothing exists for the URL", async () => {
    const result = await handleFindJob({ jobUrl: url }, "user-1");

    expect(result.content[0].text).toContain("No saved job matches");
    expect(result.content[0].text).toContain("add_job");
    expect(result.structuredContent).toEqual({ matches: [] });
  });

  it("returns the existing job id, status, completeness and current tags", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({ id: "job-1" });
    (prisma.job.findMany as any).mockResolvedValue([detailRow()]);

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
    (findExistingJobByUrl as any).mockResolvedValue({ id: "job-1" });
    (prisma.job.findMany as any).mockResolvedValue([detailRow({ tags: [] })]);

    const result = await handleFindJob({ jobUrl: url }, "user-1");
    expect(result.content[0].text).toContain("tags: none");
  });

  it("scopes the detail lookup to the caller", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({ id: "job-1" });
    (prisma.job.findMany as any).mockResolvedValue([]);

    await handleFindJob({ jobUrl: url }, "user-1");

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["job-1"] }, userId: "user-1" },
      }),
    );
  });

  it("says the job is not MCP-updatable when createdVia is null", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({ id: "job-1" });
    (prisma.job.findMany as any).mockResolvedValue([detailRow({ createdVia: null })]);

    const result = await handleFindJob({ jobUrl: url }, "user-1");

    expect(result.content[0].text).toContain("cannot be updated via MCP");
  });

  it("finds jobs by company and title alone, returning structured matches", async () => {
    (findJobIdsByNames as any).mockResolvedValue(["job-1"]);
    (prisma.job.findMany as any).mockResolvedValue([
      detailRow({ Status: { value: "applied" } }),
    ]);

    const result = await handleFindJob(
      { company: "Atolio", jobTitle: "Senior UI Engineer" },
      "user-1",
    );

    expect(findExistingJobByUrl).not.toHaveBeenCalled();
    expect(findJobIdsByNames).toHaveBeenCalledWith("user-1", {
      company: "Atolio",
      jobTitle: "Senior UI Engineer",
    });
    expect(result.structuredContent).toEqual({
      matches: [
        {
          id: "job-1",
          title: "Engineer",
          company: "Acme",
          location: "Vancouver, BC",
          status: "applied",
          createdAt: "2026-09-18T10:00:00.000Z",
          jobUrl: url,
          updatable: true,
          matchedBy: "name",
        },
      ],
    });
    expect(result.content[0].text).toContain("matched by name only");
    expect(result.content[0].text).toContain("allowDuplicate: true");
  });

  it("puts the URL match first and marks it as already saved", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({ id: "job-url" });
    (findJobIdsByNames as any).mockResolvedValue(["job-new", "job-url"]);
    (prisma.job.findMany as any).mockResolvedValue([
      detailRow({ id: "job-new", createdAt: new Date("2026-11-01T00:00:00Z") }),
      detailRow({ id: "job-url", createdAt: new Date("2025-01-01T00:00:00Z") }),
    ]);

    const result = await handleFindJob({ jobUrl: url, company: "Acme" }, "user-1");
    const matches = (result.structuredContent as any).matches;

    expect(matches.map((m: any) => [m.id, m.matchedBy])).toEqual([
      ["job-url", "url"],
      ["job-new", "name"],
    ]);
    expect(result.content[0].text).toContain("matched by URL: already saved");
  });

  it("caps the merged matches, URL match included", async () => {
    const names = Array.from({ length: 20 }, (_, i) => `n${i}`);
    (findExistingJobByUrl as any).mockResolvedValue({ id: "job-url" });
    (findJobIdsByNames as any).mockResolvedValue(names);
    (prisma.job.findMany as any).mockResolvedValue([]);

    await handleFindJob({ jobUrl: url, company: "Acme" }, "user-1");

    const where = (prisma.job.findMany as any).mock.calls[0][0].where;
    expect(where.id.in).toHaveLength(20);
    expect(where.id.in[0]).toBe("job-url");
  });

  it("finds a job by name when its saved URL differs from the one given", async () => {
    (findJobIdsByNames as any).mockResolvedValue(["job-1"]);
    (prisma.job.findMany as any).mockResolvedValue([detailRow()]);

    const result = await handleFindJob(
      { jobUrl: "https://to.indeed.com/other", company: "Acme", jobTitle: "Engineer" },
      "user-1",
    );

    expect(result.content[0].text).toContain("Found 1 saved job(s)");
  });

  it("looks up each matching id once when URL and names find the same job", async () => {
    (findExistingJobByUrl as any).mockResolvedValue({ id: "job-1" });
    (findJobIdsByNames as any).mockResolvedValue(["job-1", "job-2"]);
    (prisma.job.findMany as any).mockResolvedValue([]);

    await handleFindJob({ jobUrl: url, company: "Acme" }, "user-1");

    const where = (prisma.job.findMany as any).mock.calls[0][0].where;
    expect(where.id.in).toEqual(["job-1", "job-2"]);
  });

  it("short-circuits when rate limited", async () => {
    (checkMcpRateLimit as any).mockReturnValue({ allowed: false, resetIn: 3000 });

    const result = await handleFindJob({ jobUrl: url }, "user-1");

    expect(result.content[0].text).toContain("Rate limit exceeded");
    expect(findExistingJobByUrl).not.toHaveBeenCalled();
  });
});

describe("McpFindJobSchema", () => {
  it("requires a URL, company or job title", () => {
    expect(McpFindJobSchema.safeParse({}).success).toBe(false);
    expect(McpFindJobSchema.safeParse({ location: "Remote" }).success).toBe(false);
  });

  it("accepts company and title without a URL", () => {
    expect(
      McpFindJobSchema.safeParse({ company: "Atolio", jobTitle: "Senior UI Engineer" }).success,
    ).toBe(true);
  });
});
