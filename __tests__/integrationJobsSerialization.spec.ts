import {
  getIntegrationResumeSnapshot,
  getOwnedIntegrationJob,
  listIntegrationJobs,
  normalizeJobDescription,
  parseIntegrationJobsQuery,
  serializeIntegrationJob,
} from "@/lib/jobs/integrationRead";
import prisma from "@/lib/db";
import { getDefaultResumeForUser } from "@/lib/jobs/getDefaultResumeForUser";

vi.mock("@/lib/db", () => ({
  default: {
    job: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/jobs/getDefaultResumeForUser", () => ({
  getDefaultResumeForUser: vi.fn(),
}));

const job = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1",
  jobUrl: null,
  description: "<p>Build reliable systems</p><ul><li>Own APIs</li></ul>",
  jobType: "full-time",
  workplaceType: null,
  salaryRange: null,
  descriptionCompleteness: "full",
  JobTitle: { label: "Staff Engineer" },
  Company: { label: "Example Co" },
  Location: null,
  ...overrides,
});

describe("JobSync integration serialization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes stored HTML and rendered markdown to the same plain text", () => {
    const html = "<p>Build reliable systems</p><ul><li>Own APIs</li></ul>";
    const rawMarkdown = "Build reliable systems\n\n- Own APIs";

    expect(normalizeJobDescription(html)).toBe(
      normalizeJobDescription(rawMarkdown),
    );
    expect(normalizeJobDescription(html)).not.toContain("<p>");
  });

  it("preserves nullable persisted fields and computes missing completeness", () => {
    const serialized = serializeIntegrationJob(
      job({
        description: "<p>Short posting</p>",
        descriptionCompleteness: null,
      }) as any,
    );

    expect(serialized).toMatchObject({
      jobUrl: null,
      location: null,
      workplaceType: null,
      salaryRange: null,
      description: "Short posting",
      descriptionCompleteness: "title-only",
    });
  });

  it.each([
    ["jobUrl", { jobUrl: "https://example.com/jobs/1" }],
    ["title", { JobTitle: { label: "Principal Engineer" } }],
    ["company", { Company: { label: "Different Co" } }],
    ["location", { Location: { label: "New York, NY" } }],
    ["workplace type", { workplaceType: "hybrid" }],
    ["job type", { jobType: "contract" }],
    ["salary", { salaryRange: "$200k-$240k" }],
    ["completeness", { descriptionCompleteness: "partial" }],
    ["description", { description: "<p>Different description</p>" }],
  ])("changes the job fingerprint when %s changes", (_field, overrides) => {
    expect(serializeIntegrationJob(job() as any).fingerprint).not.toBe(
      serializeIntegrationJob(job(overrides) as any).fingerprint,
    );
  });

  it("uses stable ID keyset pagination without returning descriptions", async () => {
    (prisma.job.findMany as any).mockResolvedValue([
      job({ id: "job-2" }),
      job({ id: "job-3" }),
      job({ id: "job-4" }),
    ]);

    const page = await listIntegrationJobs("user-1", "job-1", 2);

    expect(prisma.job.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1", id: { gt: "job-1" } },
      orderBy: { id: "asc" },
      take: 3,
    }));
    expect(page.jobs).toHaveLength(2);
    expect(page.jobs[0]).not.toHaveProperty("description");
    expect(page.nextCursor).toEqual(expect.any(String));

    const next = parseIntegrationJobsQuery(
      `https://jobsync.test/api/integrations/jobs?cursor=${page.nextCursor}&limit=2`,
    );
    expect(next).toEqual({ cursorId: "job-3", limit: 2 });
  });

  it("scopes detail reads by both stable ID and authenticated user ID", async () => {
    (prisma.job.findFirst as any).mockResolvedValue(null);

    await expect(getOwnedIntegrationJob("user-1", "job-1")).resolves.toBeNull();

    expect(prisma.job.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "job-1", userId: "user-1" },
    }));
  });

  it.each([
    "https://jobsync.test/api/integrations/jobs?limit=0",
    "https://jobsync.test/api/integrations/jobs?limit=101",
    "https://jobsync.test/api/integrations/jobs?limit=1.5",
    "https://jobsync.test/api/integrations/jobs?cursor=not-a-cursor",
  ])("rejects invalid pagination input: %s", (url) => {
    expect(() => parseIntegrationJobsQuery(url)).toThrow();
  });

  it("fingerprints normalized default-resume content plus identity and title", async () => {
    const resume = {
      id: "resume-1",
      title: "Default Resume",
      ContactInfo: {
        firstName: "Robert",
        lastName: "Nguyen",
        headline: "Engineer",
        email: "robert@example.com",
        phone: "555-555-5555",
        address: "New York, NY",
      },
      ResumeSections: [{
        id: "section-1",
        resumeId: "resume-1",
        sectionTitle: "Summary",
        sectionType: "summary",
        summary: { content: "Builds reliable products" },
      }],
    };
    (getDefaultResumeForUser as any).mockResolvedValue(resume);

    const first = await getIntegrationResumeSnapshot("user-1", true);
    (getDefaultResumeForUser as any).mockResolvedValue({
      ...resume,
      ResumeSections: [{
        ...resume.ResumeSections[0],
        summary: { content: "Builds reliable products and platforms" },
      }],
    });
    const contentChanged = await getIntegrationResumeSnapshot("user-1", true);
    (getDefaultResumeForUser as any).mockResolvedValue({
      ...resume,
      title: "Updated Resume",
    });
    const titleChanged = await getIntegrationResumeSnapshot("user-1", false);

    expect(first?.content).toContain("Builds reliable products");
    expect(first?.fingerprint).not.toBe(contentChanged?.fingerprint);
    expect(first?.fingerprint).not.toBe(titleChanged?.fingerprint);
    expect(titleChanged).not.toHaveProperty("content");
  });

  it("makes resume fingerprints independent of relation query order", async () => {
    const sections = [
      {
        id: "section-b",
        resumeId: "resume-1",
        sectionTitle: "Projects",
        sectionType: "project",
        others: [
          { id: "project-b", title: "Beta", content: "Second project" },
          { id: "project-a", title: "Alpha", content: "First project" },
        ],
      },
      {
        id: "section-a",
        resumeId: "resume-1",
        sectionTitle: "Summary",
        sectionType: "summary",
        summary: { content: "Builds reliable products" },
      },
    ];
    (getDefaultResumeForUser as any).mockResolvedValue({
      id: "resume-1",
      title: "Default Resume",
      ResumeSections: sections,
    });
    const first = await getIntegrationResumeSnapshot("user-1", true);
    (getDefaultResumeForUser as any).mockResolvedValue({
      id: "resume-1",
      title: "Default Resume",
      ResumeSections: [...sections].reverse().map((section) => ({
        ...section,
        others: section.others ? [...section.others].reverse() : undefined,
      })),
    });
    const reordered = await getIntegrationResumeSnapshot("user-1", true);

    expect(first?.content).toContain("First project");
    expect(first?.fingerprint).toBe(reordered?.fingerprint);
  });
});
