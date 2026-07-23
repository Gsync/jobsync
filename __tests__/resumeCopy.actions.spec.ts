import {
  copyResume,
  getResumeCopyTitleSuggestion,
} from "@/actions/profile.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    resume: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    contactInfo: { create: vi.fn() },
    resumeSection: { create: vi.fn() },
    workExperience: { createMany: vi.fn() },
    education: { createMany: vi.fn() },
    licenseOrCertification: { createMany: vi.fn() },
    otherSection: { createMany: vi.fn() },
    skill: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

describe("getResumeCopyTitleSuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
  });

  it("suggests '(Copy)' based on the owned source resume title", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue({
      title: "Backend Resume",
    });
    (prisma.resume.findMany as any).mockResolvedValue([
      { title: "Backend Resume" },
    ]);

    const result = await getResumeCopyTitleSuggestion("resume-1");

    expect(result).toEqual({ success: true, data: "Backend Resume (Copy)" });
    expect((prisma.resume.findUnique as any).mock.calls[0][0].where).toEqual({
      id: "resume-1",
      profile: { userId: "user-1" },
    });
  });

  it("numbers the suggestion when earlier copies exist", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue({
      title: "Backend Resume",
    });
    (prisma.resume.findMany as any).mockResolvedValue([
      { title: "Backend Resume" },
      { title: "Backend Resume (Copy)" },
    ]);

    const result = await getResumeCopyTitleSuggestion("resume-1");

    expect(result).toEqual({ success: true, data: "Backend Resume (Copy 2)" });
  });

  it("fails when the resume is not owned by the current user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await getResumeCopyTitleSuggestion("someone-elses-resume");

    expect(result.success).toBe(false);
  });

  it("fails when not authenticated", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const result = await getResumeCopyTitleSuggestion("resume-1");

    expect(result.success).toBe(false);
  });
});

describe("copyResume", () => {
  const source = {
    id: "resume-1",
    profileId: "profile-1",
    title: "Backend Resume",
    ContactInfo: {
      id: "contact-1",
      firstName: "Ada",
      lastName: "Lovelace",
      headline: "Engineer",
      email: "ada@example.com",
      phone: "555",
      address: "London",
      url1: "https://a.example",
      url1Label: "Site",
      url2: null,
      url2Label: null,
    },
    ResumeSections: [
      {
        id: "section-1",
        sectionTitle: "Summary",
        sectionType: "summary",
        summary: { id: "summary-1", content: "<p>Hi</p>" },
        workExperiences: [],
        educations: [],
        licenseOrCertifications: [],
        others: [],
        skills: [],
      },
      {
        id: "section-2",
        sectionTitle: "Experience",
        sectionType: "experience",
        summary: null,
        workExperiences: [
          {
            id: "we-1",
            companyId: "company-1",
            jobTitleId: "title-1",
            locationId: "location-1",
            startDate: new Date("2020-01-01"),
            endDate: null,
            description: "<p>Work</p>",
          },
        ],
        educations: [],
        licenseOrCertifications: [],
        others: [],
        skills: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
    (prisma.resume.findUnique as any).mockResolvedValue(source);
    (prisma.resume.findMany as any).mockResolvedValue([
      { title: "Backend Resume" },
    ]);
    (prisma.resume.create as any).mockResolvedValue({ id: "resume-2" });
    (prisma.resumeSection.create as any)
      .mockResolvedValueOnce({ id: "new-section-1" })
      .mockResolvedValueOnce({ id: "new-section-2" });
    (prisma.$transaction as any).mockImplementation((cb: any) => cb(prisma));
  });

  it("creates the new resume without file, review data or job links", async () => {
    const result = await copyResume("resume-1", "Backend Resume (Copy)");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: "resume-2",
      title: "Backend Resume (Copy)",
    });

    const createArgs = (prisma.resume.create as any).mock.calls[0][0];
    expect(createArgs.data).toEqual({
      profileId: "profile-1",
      title: "Backend Resume (Copy)",
    });
    expect(createArgs.data).not.toHaveProperty("FileId");
    expect(createArgs.data).not.toHaveProperty("reviewData");
  });

  it("clones contact info onto the new resume", async () => {
    await copyResume("resume-1", "Backend Resume (Copy)");

    const args = (prisma.contactInfo.create as any).mock.calls[0][0];
    expect(args.data).toMatchObject({
      resumeId: "resume-2",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      url1: "https://a.example",
    });
    expect(args.data).not.toHaveProperty("id");
  });

  it("clones each section, its summary and its work experiences", async () => {
    await copyResume("resume-1", "Backend Resume (Copy)");

    expect(prisma.resumeSection.create).toHaveBeenCalledTimes(2);
    const first = (prisma.resumeSection.create as any).mock.calls[0][0];
    expect(first.data).toMatchObject({
      Resume: { connect: { id: "resume-2" } },
      sectionTitle: "Summary",
      sectionType: "summary",
      summary: { create: { content: "<p>Hi</p>" } },
    });

    const we = (prisma.workExperience.createMany as any).mock.calls[0][0];
    expect(we.data).toEqual([
      {
        resumeSectionId: "new-section-2",
        companyId: "company-1",
        jobTitleId: "title-1",
        locationId: "location-1",
        startDate: new Date("2020-01-01"),
        endDate: null,
        description: "<p>Work</p>",
      },
    ]);
  });

  it("runs every write inside one transaction", async () => {
    await copyResume("resume-1", "Backend Resume (Copy)");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("uniquifies a user-supplied title that is already taken", async () => {
    (prisma.resume.findMany as any).mockResolvedValue([
      { title: "Backend Resume" },
      { title: "My Copy" },
    ]);

    const result = await copyResume("resume-1", "My Copy");

    expect(result.data.title).toBe("My Copy (2)");
    expect((prisma.resume.create as any).mock.calls[0][0].data.title).toBe(
      "My Copy (2)",
    );
  });

  it("rejects a source resume with too few sections", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue({
      ...source,
      ResumeSections: [source.ResumeSections[0]],
    });

    const result = await copyResume("resume-1", "Backend Resume (Copy)");

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a resume owned by another user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await copyResume("someone-elses-resume", "Copy");

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when not authenticated", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const result = await copyResume("resume-1", "Copy");

    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
