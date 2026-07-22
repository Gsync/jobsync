import { updateJobFromNames } from "@/lib/jobs/updateJobFromNames";
import {
  resolveCompany,
  resolveJobTitle,
  resolveLocation,
  resolveJobSource,
  resolveJobType,
  resolveWorkplaceType,
  resolveJobStatus,
  resolveTags,
} from "@/lib/jobs/resolve";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    job: { findFirst: vi.fn(), update: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/jobs/resolve", () => ({
  resolveCompany: vi.fn(),
  resolveJobTitle: vi.fn(),
  resolveLocation: vi.fn(),
  resolveJobSource: vi.fn(),
  resolveJobType: vi.fn(),
  resolveWorkplaceType: vi.fn(),
  resolveJobStatus: vi.fn(),
  resolveTags: vi.fn(),
}));

const userId = "user-1";
const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

describe("updateJobFromNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.job.findFirst as any).mockResolvedValue({
      id: "job-1",
      descriptionCompleteness: "title-only",
    });
    (prisma.job.update as any).mockResolvedValue({ id: "job-1" });
    (resolveCompany as any).mockResolvedValue({ id: "company-1", label: "Acme", created: false });
    (resolveJobTitle as any).mockResolvedValue({ id: "title-1", label: "Engineer", created: false });
    (resolveLocation as any).mockResolvedValue({ id: "loc-1", label: "Remote", created: true });
    (resolveJobSource as any).mockResolvedValue({ id: "src-1", label: "Indeed", created: false });
    (resolveJobStatus as any).mockResolvedValue("status-1");
    (resolveJobType as any).mockReturnValue("FT");
    (resolveWorkplaceType as any).mockReturnValue("REMOTE");
    (resolveTags as any).mockResolvedValue({ resolved: [], dropped: [] });
  });

  it("returns updated:false when the job is not the caller's MCP-created job", async () => {
    (prisma.job.findFirst as any).mockResolvedValue(null);

    const result = await updateJobFromNames({ jobId: "job-x" }, userId);

    expect(result.updated).toBe(false);
    expect(result.message).toContain("not found");
    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  it("scopes the ownership lookup to userId and MCP-created jobs", async () => {
    await updateJobFromNames({ jobId: "job-1", salaryRange: "$1" }, userId);

    expect(prisma.job.findFirst).toHaveBeenCalledWith({
      where: { id: "job-1", userId, createdVia: { not: null } },
      select: { id: true, descriptionCompleteness: true },
    });
  });

  it("patches only the provided fields", async () => {
    await updateJobFromNames({ jobId: "job-1", salaryRange: "$150k" }, userId);

    const call = (prisma.job.update as any).mock.calls[0][0];
    expect(call.where).toEqual({ id: "job-1", userId, createdVia: { not: null } });
    expect(call.data).toEqual({ salaryRange: "$150k" });
  });

  it("re-renders the description and reclassifies completeness", async () => {
    const result = await updateJobFromNames(
      { jobId: "job-1", jobDescription: words(200) },
      userId,
    );

    const data = (prisma.job.update as any).mock.calls[0][0].data;
    expect(data.description).toContain("<p>");
    expect(data.descriptionCompleteness).toBe("full");
    expect(result.descriptionChanged).toBe(true);
    expect(result.descriptionCompleteness).toBe("full");
  });

  it("reports descriptionChanged:false and the stored completeness when description is untouched", async () => {
    const result = await updateJobFromNames(
      { jobId: "job-1", status: "applied" },
      userId,
    );

    expect(result.descriptionChanged).toBe(false);
    expect(result.descriptionCompleteness).toBe("title-only");
  });

  it("resolves name-based fields to ids and reports them", async () => {
    const result = await updateJobFromNames(
      { jobId: "job-1", company: "Acme", jobTitle: "Engineer", location: "Remote" },
      userId,
    );

    const data = (prisma.job.update as any).mock.calls[0][0].data;
    expect(data).toEqual({
      companyId: "company-1",
      jobTitleId: "title-1",
      locationId: "loc-1",
    });
    expect(result.message).toContain("Created Remote");
    expect(result.message).toContain("Matched Acme");
  });

  it("replaces tags wholesale when tags are provided", async () => {
    (resolveTags as any).mockResolvedValue({
      resolved: [{ id: "tag-1", label: "React", created: false }],
      dropped: [],
    });

    await updateJobFromNames({ jobId: "job-1", tags: ["React"] }, userId);

    const data = (prisma.job.update as any).mock.calls[0][0].data;
    expect(data.tags).toEqual({ set: [{ id: "tag-1" }] });
  });

  it("normalizes a supplied jobUrl", async () => {
    await updateJobFromNames(
      { jobId: "job-1", jobUrl: "https://example.com/job/1?utm_source=x" },
      userId,
    );

    const data = (prisma.job.update as any).mock.calls[0][0].data;
    expect(data.jobUrl).not.toContain("utm_source");
  });

  it("defaults appliedDate to now when applied flips true without a date", async () => {
    await updateJobFromNames({ jobId: "job-1", applied: true }, userId);

    const data = (prisma.job.update as any).mock.calls[0][0].data;
    expect(data.applied).toBe(true);
    expect(data.appliedDate).toBeInstanceOf(Date);
  });

  it("returns updated:false with a not-found message on P2025", async () => {
    (prisma.job.update as any).mockRejectedValue({ code: "P2025" });

    const result = await updateJobFromNames(
      { jobId: "job-1", salaryRange: "$1" },
      userId,
    );

    expect(result.updated).toBe(false);
    expect(result.message).toContain("not found");
  });

  it("reports a no-op when no updatable field is supplied", async () => {
    const result = await updateJobFromNames({ jobId: "job-1" }, userId);

    expect(result.updated).toBe(false);
    expect(result.message).toContain("No fields to update");
    expect(prisma.job.update).not.toHaveBeenCalled();
  });
});
