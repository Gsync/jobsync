import { resolveImportCard } from "@/actions/resumeImport.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { createJobTitle } from "@/actions/jobtitle.actions";
import { createLocation } from "@/actions/job.actions";
import { PrismaClient } from "@prisma/client";
import { APP_CONSTANTS } from "@/lib/constants";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    resume: { findUnique: vi.fn(), update: vi.fn() },
    resumeSection: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    summary: { update: vi.fn() },
    company: { findFirst: vi.fn(), create: vi.fn() },
    skill: { createMany: vi.fn() },
    tag: { findUnique: vi.fn(), create: vi.fn() },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/actions/jobtitle.actions", () => ({ createJobTitle: vi.fn() }));
vi.mock("@/actions/job.actions", () => ({ createLocation: vi.fn() }));

describe("resolveImportCard — skills", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findUnique as any).mockResolvedValue({ id: "resume-1" });
    (prisma.resumeSection.create as any).mockResolvedValue({ id: "section-1" });
    (prisma.skill.createMany as any).mockResolvedValue({ count: 0 });
    // resolveTag: every name is a brand-new tag
    (prisma.tag.findUnique as any).mockResolvedValue(null);
    (prisma.tag.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: `tag-${data.value}`,
        label: data.label,
        value: data.value,
        createdBy: data.createdBy,
      }),
    );
  });

  it("creates a SKILLS section and skill rows with resolved tags, categories and order", async () => {
    const result = await resolveImportCard("resume-1", {
      type: "skills",
      data: {
        categories: [
          { label: "Languages", skills: ["TypeScript", "Go"] },
          { label: "Tools", skills: ["Docker"] },
        ],
      },
    } as any);

    expect(result).toEqual({ success: true, status: "saved" });

    expect(prisma.resumeSection.create).toHaveBeenCalledWith({
      data: {
        resumeId: "resume-1",
        sectionTitle: "Skills",
        sectionType: "skills",
      },
    });

    expect(prisma.skill.createMany).toHaveBeenCalledWith({
      data: [
        { tagId: "tag-typescript", category: "Languages", order: 0, resumeSectionId: "section-1" },
        { tagId: "tag-go", category: "Languages", order: 1, resumeSectionId: "section-1" },
        { tagId: "tag-docker", category: "Tools", order: 2, resumeSectionId: "section-1" },
      ],
    });
  });

  it("stores a null category when no label is given", async () => {
    await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ skills: ["React"] }] },
    } as any);

    const rows = (prisma.skill.createMany as any).mock.calls[0][0].data;
    expect(rows[0].category).toBeNull();
  });

  it("trims skills and drops empty entries/categories", async () => {
    await resolveImportCard("resume-1", {
      type: "skills",
      data: {
        categories: [
          { label: "  Backend  ", skills: ["  SQL  ", "", "   "] },
          { label: "Empty", skills: [] },
        ],
      },
    } as any);

    const rows = (prisma.skill.createMany as any).mock.calls[0][0].data;
    expect(rows).toEqual([
      { tagId: "tag-sql", category: "Backend", order: 0, resumeSectionId: "section-1" },
    ]);
  });

  it("caps categories and skills per category at the app limits", async () => {
    const tooManyCategories = Array.from(
      { length: APP_CONSTANTS.MAX_SKILL_CATEGORIES + 3 },
      (_, c) => ({
        label: `cat-${c}`,
        skills: Array.from(
          { length: APP_CONSTANTS.MAX_SKILLS_PER_CATEGORY + 5 },
          (_, s) => `c${c}s${s}`,
        ),
      }),
    );

    await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: tooManyCategories },
    } as any);

    const rows = (prisma.skill.createMany as any).mock.calls[0][0].data;
    const categories = new Set(rows.map((r: any) => r.category));
    expect(categories.size).toBe(APP_CONSTANTS.MAX_SKILL_CATEGORIES);
    expect(rows).toHaveLength(
      APP_CONSTANTS.MAX_SKILL_CATEGORIES * APP_CONSTANTS.MAX_SKILLS_PER_CATEGORY,
    );
  });

  it("fails when there are no usable skills (no section created)", async () => {
    const result = await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ label: "X", skills: ["  "] }] },
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
    expect(prisma.skill.createMany).not.toHaveBeenCalled();
  });

  it("rejects when the resume is not owned by the user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ skills: ["React"] }] },
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ skills: ["React"] }] },
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resume.findUnique).not.toHaveBeenCalled();
  });

  it("reuses an existing tag instead of creating a duplicate", async () => {
    (prisma.tag.findUnique as any).mockResolvedValue({
      id: "existing-tag",
      label: "React",
      value: "react",
      createdBy: mockUser.id,
    });

    await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ skills: ["React"] }] },
    } as any);

    expect(prisma.tag.create).not.toHaveBeenCalled();
    const rows = (prisma.skill.createMany as any).mock.calls[0][0].data;
    expect(rows[0].tagId).toBe("existing-tag");
  });
});

describe("resolveImportCard — contactInfo", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findUnique as any).mockResolvedValue({ id: "resume-1" });
    (prisma.resume.update as any).mockResolvedValue({});
  });

  it("connects or creates ContactInfo with the given fields", async () => {
    const result = await resolveImportCard("resume-1", {
      type: "contactInfo",
      data: {
        firstName: "Jane",
        lastName: "Doe",
        headline: "Engineer",
        email: "jane@example.com",
        phone: "555-1234",
        address: "123 Main St",
      },
    } as any);

    expect(result).toEqual({ success: true, status: "saved" });
    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: "resume-1", profile: { userId: mockUser.id } },
      data: {
        ContactInfo: {
          connectOrCreate: {
            where: { resumeId: "resume-1" },
            create: {
              firstName: "Jane",
              lastName: "Doe",
              headline: "Engineer",
              email: "jane@example.com",
              phone: "555-1234",
              address: "123 Main St",
            },
          },
        },
      },
    });
  });

  it("defaults missing string fields to empty strings", async () => {
    await resolveImportCard("resume-1", { type: "contactInfo", data: {} } as any);

    const call = (prisma.resume.update as any).mock.calls[0][0];
    expect(call.data.ContactInfo.connectOrCreate.create).toEqual(
      expect.objectContaining({
        firstName: "",
        lastName: "",
        headline: "",
        email: "",
        phone: "",
      }),
    );
  });

  it("rejects when the resume is not owned by the user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "contactInfo",
      data: {},
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resume.update).not.toHaveBeenCalled();
  });
});

describe("resolveImportCard — summary", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findUnique as any).mockResolvedValue({ id: "resume-1" });
  });

  it("creates a new SUMMARY section and summary when none exists", async () => {
    (prisma.resumeSection.findFirst as any).mockResolvedValue(null);
    (prisma.resumeSection.create as any).mockResolvedValue({ id: "section-1" });
    (prisma.resumeSection.update as any).mockResolvedValue({});

    const result = await resolveImportCard("resume-1", {
      type: "summary",
      data: "Experienced engineer.",
    } as any);

    expect(result).toEqual({ success: true, status: "saved" });
    expect(prisma.resumeSection.create).toHaveBeenCalledWith({
      data: { resumeId: "resume-1", sectionTitle: "Summary", sectionType: "summary" },
    });
    expect(prisma.resumeSection.update).toHaveBeenCalledWith({
      where: { id: "section-1" },
      data: { summary: { create: { content: "<p>Experienced engineer.</p>" } } },
    });
  });

  it("updates the existing summary when a SUMMARY section already exists", async () => {
    (prisma.resumeSection.findFirst as any).mockResolvedValue({
      id: "section-1",
      summaryId: "summary-1",
    });
    (prisma.summary.update as any).mockResolvedValue({});

    await resolveImportCard("resume-1", {
      type: "summary",
      data: "Updated summary.",
    } as any);

    expect(prisma.summary.update).toHaveBeenCalledWith({
      where: { id: "summary-1" },
      data: { content: "<p>Updated summary.</p>" },
    });
    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
  });

  it("HTML-escapes summary text and splits multiple lines into paragraphs", async () => {
    (prisma.resumeSection.findFirst as any).mockResolvedValue(null);
    (prisma.resumeSection.create as any).mockResolvedValue({ id: "section-1" });
    (prisma.resumeSection.update as any).mockResolvedValue({});

    await resolveImportCard("resume-1", {
      type: "summary",
      data: "Line one <b>\nLine two",
    } as any);

    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.summary.create.content).toBe(
      "<p>Line one &lt;b&gt;</p><p>Line two</p>",
    );
  });

  it("rejects when the resume is not owned by the user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "summary",
      data: "Some summary",
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resumeSection.findFirst).not.toHaveBeenCalled();
  });
});

describe("resolveImportCard — experience", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.resetAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findUnique as any).mockResolvedValue({ id: "resume-1" });
    (prisma.company.findFirst as any).mockResolvedValue(null);
    (prisma.company.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "company-1", ...data }),
    );
    (createJobTitle as any).mockResolvedValue({ id: "title-1" });
    (createLocation as any).mockResolvedValue({ data: { id: "location-1" }, success: true });
    (prisma.resumeSection.findFirst as any).mockResolvedValue(null);
    (prisma.resumeSection.create as any).mockResolvedValue({ id: "section-1" });
    (prisma.resumeSection.update as any).mockResolvedValue({});
  });

  it("resolves company/jobTitle/location and creates a work experience", async () => {
    const result = await resolveImportCard("resume-1", {
      type: "experience",
      data: {
        company: "Acme",
        jobTitle: "Engineer",
        location: "Remote",
        startDate: "Jan 2020",
        endDate: "present",
        description: "Built things.",
      },
    } as any);

    expect(result).toEqual({ success: true, status: "saved" });
    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.workExperiences.create).toEqual(
      expect.objectContaining({
        jobTitleId: "title-1",
        locationId: "location-1",
        startDate: new Date("Jan 1, 2020"),
        endDate: undefined,
        description: "<p>Built things.</p>",
      }),
    );
  });

  it("reuses an existing EXPERIENCE section instead of creating a new one", async () => {
    (prisma.resumeSection.findFirst as any).mockResolvedValue({ id: "existing-section" });

    await resolveImportCard("resume-1", {
      type: "experience",
      data: { company: "Acme", jobTitle: "Engineer" },
    } as any);

    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
    expect(prisma.resumeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "existing-section" }) }),
    );
  });

  it("falls back to a placeholder location when none is provided", async () => {
    (createLocation as any).mockResolvedValue({
      data: { id: "fallback-location" },
      success: true,
    });

    await resolveImportCard("resume-1", {
      type: "experience",
      data: { company: "Acme", jobTitle: "Engineer" },
    } as any);

    expect(createLocation).toHaveBeenLastCalledWith("Not specified");
    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.workExperiences.create.locationId).toBe("fallback-location");
  });

  it("defaults startDate to Jan 1 2000 when unparsable/missing", async () => {
    await resolveImportCard("resume-1", {
      type: "experience",
      data: { company: "Acme", jobTitle: "Engineer" },
    } as any);

    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.workExperiences.create.startDate).toEqual(new Date(2000, 0, 1));
  });

  it("rejects when the resume is not owned by the user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "experience",
      data: { company: "Acme", jobTitle: "Engineer" },
    } as any);

    expect(result.success).toBe(false);
    expect(createJobTitle).not.toHaveBeenCalled();
  });
});

describe("resolveImportCard — education", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.resetAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findUnique as any).mockResolvedValue({ id: "resume-1" });
    (createLocation as any).mockResolvedValue({ data: { id: "location-1" }, success: true });
    (prisma.resumeSection.findFirst as any).mockResolvedValue(null);
    (prisma.resumeSection.create as any).mockResolvedValue({ id: "section-1" });
    (prisma.resumeSection.update as any).mockResolvedValue({});
  });

  it("creates an education entry with resolved location and parsed dates", async () => {
    const result = await resolveImportCard("resume-1", {
      type: "education",
      data: {
        institution: "State University",
        degree: "BSc",
        fieldOfStudy: "Computer Science",
        location: "Somewhere",
        startDate: "2016",
        endDate: "2020",
        description: "Graduated with honors.",
      },
    } as any);

    expect(result).toEqual({ success: true, status: "saved" });
    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.educations.create).toEqual(
      expect.objectContaining({
        institution: "State University",
        degree: "BSc",
        fieldOfStudy: "Computer Science",
        locationId: "location-1",
        startDate: new Date(2016, 0, 1),
        endDate: new Date(2020, 0, 1),
        description: "<p>Graduated with honors.</p>",
      }),
    );
  });

  it("falls back to a placeholder location when none is provided or resolvable", async () => {
    (createLocation as any).mockResolvedValue({
      data: { id: "fallback-location" },
      success: true,
    });

    await resolveImportCard("resume-1", {
      type: "education",
      data: { institution: "State University" },
    } as any);

    expect(createLocation).toHaveBeenLastCalledWith("Not specified");
    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.educations.create.locationId).toBe("fallback-location");
  });

  it("defaults degree/fieldOfStudy to empty strings when omitted", async () => {
    await resolveImportCard("resume-1", {
      type: "education",
      data: { institution: "State University" },
    } as any);

    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.educations.create).toEqual(
      expect.objectContaining({ degree: "", fieldOfStudy: "" }),
    );
  });

  it("rejects when the resume is not owned by the user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "education",
      data: { institution: "State University" },
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
  });
});

describe("resolveImportCard — certification", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findUnique as any).mockResolvedValue({ id: "resume-1" });
    (prisma.resumeSection.findFirst as any).mockResolvedValue(null);
    (prisma.resumeSection.create as any).mockResolvedValue({ id: "section-1" });
    (prisma.resumeSection.update as any).mockResolvedValue({});
  });

  it("creates a certification entry with parsed issue/expiration dates", async () => {
    const result = await resolveImportCard("resume-1", {
      type: "certification",
      data: {
        title: "AWS Certified",
        organization: "Amazon",
        issueDate: "Jun 2021",
        expirationDate: "Jun 2024",
        credentialUrl: "https://example.com/cred",
      },
    } as any);

    expect(result).toEqual({ success: true, status: "saved" });
    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.licenseOrCertifications.create).toEqual(
      expect.objectContaining({
        title: "AWS Certified",
        organization: "Amazon",
        issueDate: new Date("Jun 1, 2021"),
        expirationDate: new Date("Jun 1, 2024"),
        credentialUrl: "https://example.com/cred",
      }),
    );
  });

  it("reuses an existing CERTIFICATION section instead of creating a new one", async () => {
    (prisma.resumeSection.findFirst as any).mockResolvedValue({ id: "existing-section" });

    await resolveImportCard("resume-1", {
      type: "certification",
      data: { title: "AWS Certified" },
    } as any);

    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
  });

  it("defaults organization to an empty string and dates to undefined when omitted", async () => {
    await resolveImportCard("resume-1", {
      type: "certification",
      data: { title: "AWS Certified" },
    } as any);

    const call = (prisma.resumeSection.update as any).mock.calls[0][0];
    expect(call.data.licenseOrCertifications.create).toEqual(
      expect.objectContaining({
        organization: "",
        issueDate: undefined,
        expirationDate: undefined,
      }),
    );
  });

  it("rejects when the resume is not owned by the user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "certification",
      data: { title: "AWS Certified" },
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
  });
});
