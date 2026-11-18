import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { createJobRecord } from "@/lib/jobs/createJobRecord";
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
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient({} as never);

vi.mock("@/generated/prisma/client", () => {
  const mPrismaClient = {
    job: { findFirst: vi.fn(), findMany: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/jobs/createJobRecord", () => ({
  createJobRecord: vi.fn(),
}));

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

const baseInput = {
  company: "Acme",
  jobTitle: "Engineer",
  jobDescription: "Build things",
};

describe("createJobFromNames", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (resolveCompany as any).mockResolvedValue({ id: "company-1", label: "Acme", created: true });
    (resolveJobTitle as any).mockResolvedValue({ id: "title-1", label: "Engineer", created: true });
    (resolveLocation as any).mockResolvedValue(null);
    (resolveJobSource as any).mockResolvedValue(null);
    (resolveJobType as any).mockReturnValue("Full-time");
    (resolveWorkplaceType as any).mockReturnValue(null);
    (resolveJobStatus as any).mockResolvedValue("status-1");
    (resolveTags as any).mockResolvedValue({ resolved: [], dropped: [] });
    (prisma.job.findFirst as any).mockResolvedValue(null);
    (prisma.job.findMany as any).mockResolvedValue([]);
    (createJobRecord as any).mockResolvedValue({ id: "job-1" });
  });

  it("defaults dueDate to 3 days from now when omitted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-10T12:00:00Z"));
    try {
      await createJobFromNames(baseInput, userId);
    } finally {
      vi.useRealTimers();
    }

    expect(createJobRecord).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: new Date("2030-01-13T12:00:00Z") }),
    );
  });

  it("keeps a supplied dueDate", async () => {
    const dueDate = new Date("2030-02-01T00:00:00Z");
    await createJobFromNames({ ...baseInput, dueDate }, userId);

    expect(createJobRecord).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate }),
    );
  });

  it("creates a job and reports matched/created resolutions in the message", async () => {
    const result = await createJobFromNames(baseInput, userId);

    expect(result.created).toBe(true);
    expect(result.jobId).toBe("job-1");
    expect(result.message).toBe("Created Acme; Created Engineer. Job created (id: job-1).");
    expect(createJobRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        jobTitleId: "title-1",
        statusId: "status-1",
        jobType: "Full-time",
        userId,
        applied: false,
        appliedDate: null,
      }),
    );
  });

  it("defaults appliedDate to now when applied is true and no date given", async () => {
    const before = Date.now();
    await createJobFromNames({ ...baseInput, applied: true }, userId);
    const after = Date.now();

    const call = (createJobRecord as any).mock.calls[0][0];
    expect(call.applied).toBe(true);
    expect(call.appliedDate.getTime()).toBeGreaterThanOrEqual(before);
    expect(call.appliedDate.getTime()).toBeLessThanOrEqual(after);
  });

  it("uses the given appliedDate when provided", async () => {
    const appliedDate = new Date("2026-01-01T00:00:00Z");
    await createJobFromNames({ ...baseInput, applied: true, appliedDate }, userId);

    const call = (createJobRecord as any).mock.calls[0][0];
    expect(call.appliedDate).toBe(appliedDate);
  });

  it("appends dropped tags to the success message", async () => {
    (resolveTags as any).mockResolvedValue({
      resolved: [{ id: "tag-1", label: "React", created: false }],
      dropped: ["Extra1", "Extra2"],
    });

    const result = await createJobFromNames(baseInput, userId);

    expect(result.message).toContain("Dropped tags exceeding limit: Extra1, Extra2.");
  });

  it("skips duplicate detection when allowDuplicate is true", async () => {
    await createJobFromNames({ ...baseInput, allowDuplicate: true }, userId);

    expect(prisma.job.findFirst).not.toHaveBeenCalled();
    expect(createJobRecord).toHaveBeenCalled();
  });

  it("detects a duplicate by jobUrl (aggressive key catches www/case/tracking variants)", async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([
      {
        id: "existing-job",
        jobUrl: "https://www.Example.com/job/1?utm_source=x",
        createdVia: "my-token",
        Status: { value: "applied" },
        JobTitle: { label: "Engineer" },
        Company: { label: "Acme" },
      },
    ]);

    const result = await createJobFromNames(
      { ...baseInput, jobUrl: "https://example.com/job/1" },
      userId,
    );

    expect(result.created).toBe(false);
    expect(result.duplicateOf).toEqual({
      id: "existing-job",
      title: "Engineer",
      company: "Acme",
      location: null,
      status: "applied",
      updatable: true,
    });
    expect(result.message).toContain("status: applied");
    expect(result.message).toContain("Duplicate detected");
    expect(result.message).toContain("update_job");
    expect(createJobRecord).not.toHaveBeenCalled();
  });

  it("detects a duplicate by company+title within the window when no URL is given", async () => {
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      id: "existing-job-2",
      createdVia: "my-token",
      Status: { value: "withdrawn" },
      JobTitle: { label: "Engineer" },
      Company: { label: "Acme" },
    });

    const result = await createJobFromNames(baseInput, userId);

    expect(result.created).toBe(false);
    expect(result.duplicateOf).toMatchObject({ id: "existing-job-2", status: "withdrawn" });
    expect(createJobRecord).not.toHaveBeenCalled();
  });

  it("looks back 60 days for a company+title match", async () => {
    const now = new Date("2026-11-17T12:00:00Z");
    vi.useFakeTimers({ now });
    try {
      await createJobFromNames(baseInput, userId);
    } finally {
      vi.useRealTimers();
    }

    const where = (prisma.job.findFirst as any).mock.calls[0][0].where;
    expect(where.createdAt.gte).toEqual(new Date("2026-09-18T12:00:00Z"));
  });

  it("does not compare location in the company+title check, but reports it", async () => {
    (resolveLocation as any).mockResolvedValue({ id: "loc-1", label: "Toronto, ON", created: false });
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      id: "existing-job-3",
      createdVia: "my-token",
      Status: { value: "applied" },
      JobTitle: { label: "Engineer" },
      Company: { label: "Acme" },
      Location: { label: "Toronto, Ontario, Canada" },
    });

    const result = await createJobFromNames({ ...baseInput, location: "Toronto, ON" }, userId);

    const where = (prisma.job.findFirst as any).mock.calls[0][0].where;
    expect(where).not.toHaveProperty("OR");
    expect(where).not.toHaveProperty("locationId");
    expect(result.created).toBe(false);
    expect(result.message).toContain("location: Toronto, Ontario, Canada");
  });

  it("does not point at update_job when the duplicate is a web-app job", async () => {
    (prisma.job.findFirst as any).mockResolvedValueOnce({
      id: "web-job",
      createdVia: null,
      Status: { value: "interview" },
      JobTitle: { label: "Engineer" },
      Company: { label: "Acme" },
    });

    const result = await createJobFromNames(baseInput, userId);

    expect(result.message).toContain("created in the web app");
    expect(result.message).not.toContain("call update_job");
  });

  it("creates the job when no duplicate is found", async () => {
    const result = await createJobFromNames(baseInput, userId);

    expect(result.created).toBe(true);
    expect(result.duplicateOf).toBeUndefined();
  });

  it("classifies and persists descriptionCompleteness from the raw description", async () => {
    const full = Array.from({ length: 200 }, () => "word").join(" ");
    const result = await createJobFromNames(
      { ...baseInput, jobDescription: full },
      userId,
    );

    expect(result.descriptionCompleteness).toBe("full");
    expect(createJobRecord).toHaveBeenCalledWith(
      expect.objectContaining({ descriptionCompleteness: "full" }),
    );
  });

  it("marks a stub description as title-only", async () => {
    const result = await createJobFromNames(
      { ...baseInput, jobDescription: "Frontend Developer, $120k, Remote." },
      userId,
    );

    expect(result.descriptionCompleteness).toBe("title-only");
    expect(createJobRecord).toHaveBeenCalledWith(
      expect.objectContaining({ descriptionCompleteness: "title-only" }),
    );
  });
});
