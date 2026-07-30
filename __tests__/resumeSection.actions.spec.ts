import {
  addResumeSummary,
  updateResumeSummary,
  addExperience,
  updateExperience,
  addEducation,
  updateEducation,
  addCertification,
  updateCertification,
  addSkillsSection,
  updateSkillsSection,
  deleteSkillsSection,
} from "@/actions/profile.actions";
import { SectionType } from "@/models/profile.model";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    resume: { findUnique: vi.fn() },
    resumeSection: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    workExperience: { update: vi.fn() },
    education: { update: vi.fn() },
    licenseOrCertification: { update: vi.fn() },
    skill: { createMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const ownsResume = () =>
  (prisma.resume.findUnique as any).mockResolvedValue({ id: "resume-1" });
const ownsNothing = () =>
  (prisma.resume.findUnique as any).mockResolvedValue(null);

describe("Resume section actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
    (prisma.resumeSection.create as any).mockResolvedValue({
      id: "section-new",
    });
    (prisma.resumeSection.update as any).mockResolvedValue({ id: "section-1" });
  });

  describe("addResumeSummary", () => {
    it("creates a SUMMARY section on an owned resume, then attaches the content", async () => {
      ownsResume();

      const result = await addResumeSummary({
        resumeId: "resume-1",
        sectionTitle: "Summary",
        content: "<p>Hello</p>",
      } as any);

      expect(result.success).toBe(true);
      expect((prisma.resume.findUnique as any).mock.calls[0][0].where).toEqual({
        id: "resume-1",
        profile: { userId: "user-1" },
      });
      expect((prisma.resumeSection.create as any).mock.calls[0][0].data).toEqual(
        {
          resumeId: "resume-1",
          sectionTitle: "Summary",
          sectionType: SectionType.SUMMARY,
        },
      );
      expect((prisma.resumeSection.update as any).mock.calls[0][0]).toEqual({
        where: { id: "section-new" },
        data: { summary: { create: { content: "<p>Hello</p>" } } },
      });
    });

    it("refuses a resume the user does not own", async () => {
      ownsNothing();

      const result = await addResumeSummary({
        resumeId: "someone-elses-resume",
        sectionTitle: "Summary",
        content: "<p>Hello</p>",
      } as any);

      expect(result).toEqual({
        success: false,
        message: "Resume not found or access denied",
      });
      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
    });

    it("fails without writing when unauthenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await addResumeSummary({
        resumeId: "resume-1",
        sectionTitle: "Summary",
        content: "<p>Hello</p>",
      } as any);

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.resume.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("updateResumeSummary", () => {
    it("scopes both writes to the owning user", async () => {
      const result = await updateResumeSummary({
        id: "section-1",
        resumeId: "resume-1",
        sectionTitle: "Profile",
        content: "<p>Updated</p>",
      } as any);

      expect(result.success).toBe(true);
      const calls = (prisma.resumeSection.update as any).mock.calls;
      expect(calls).toHaveLength(2);
      for (const [arg] of calls) {
        expect(arg.where).toEqual({
          id: "section-1",
          Resume: { profile: { userId: "user-1" } },
        });
      }
      expect(calls[0][0].data).toEqual({ sectionTitle: "Profile" });
      expect(calls[1][0].data).toEqual({
        summary: { update: { content: "<p>Updated</p>" } },
      });
    });
  });

  describe("addExperience", () => {
    const form = {
      resumeId: "resume-1",
      sectionTitle: "Experience",
      title: "title-1",
      company: "company-1",
      location: "location-1",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2022-01-01"),
      jobDescription: "<p>Built things</p>",
    };

    it("creates the section when no sectionId is supplied", async () => {
      ownsResume();

      const result = await addExperience(form as any);

      expect(result.success).toBe(true);
      expect((prisma.resumeSection.create as any).mock.calls[0][0].data).toEqual(
        {
          resumeId: "resume-1",
          sectionTitle: "Experience",
          sectionType: SectionType.EXPERIENCE,
        },
      );
      expect((prisma.resumeSection.update as any).mock.calls[0][0].where).toEqual(
        { id: "section-new", resumeId: "resume-1" },
      );
    });

    it("reuses an existing section instead of creating another", async () => {
      ownsResume();

      await addExperience({ ...form, sectionId: "section-existing" } as any);

      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
      expect((prisma.resumeSection.update as any).mock.calls[0][0].where).toEqual(
        { id: "section-existing", resumeId: "resume-1" },
      );
    });

    it("scopes a supplied sectionId to the owned resume", async () => {
      ownsResume();

      await addExperience({
        ...form,
        sectionId: "someone-elses-section",
      } as any);

      expect((prisma.resumeSection.update as any).mock.calls[0][0].where).toEqual(
        { id: "someone-elses-section", resumeId: "resume-1" },
      );
    });

    it("maps the form onto the workExperience create payload", async () => {
      ownsResume();

      await addExperience(form as any);

      expect(
        (prisma.resumeSection.update as any).mock.calls[0][0].data
          .workExperiences.create,
      ).toEqual({
        jobTitleId: "title-1",
        companyId: "company-1",
        locationId: "location-1",
        startDate: form.startDate,
        endDate: form.endDate,
        description: "<p>Built things</p>",
      });
    });

    it("requires a section title when creating a new section", async () => {
      ownsResume();

      const result = await addExperience({
        ...form,
        sectionTitle: undefined,
      } as any);

      expect(result).toEqual({
        success: false,
        message: "SectionTitle is required.",
      });
      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
    });

    it("refuses a resume the user does not own", async () => {
      ownsNothing();

      const result = await addExperience(form as any);

      expect(result.success).toBe(false);
      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
      expect(prisma.resumeSection.update).not.toHaveBeenCalled();
    });
  });

  describe("updateExperience", () => {
    it("scopes the update through section -> resume -> profile", async () => {
      (prisma.workExperience.update as any).mockResolvedValue({ id: "exp-1" });

      const result = await updateExperience({
        id: "exp-1",
        resumeId: "resume-1",
        title: "title-2",
        company: "company-2",
        location: "location-2",
        startDate: new Date("2021-01-01"),
        endDate: null,
        jobDescription: "<p>Now</p>",
      } as any);

      expect(result.success).toBe(true);
      expect((prisma.workExperience.update as any).mock.calls[0][0].where).toEqual(
        {
          id: "exp-1",
          ResumeSection: { Resume: { profile: { userId: "user-1" } } },
        },
      );
    });

    it("fails without writing when unauthenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await updateExperience({ id: "exp-1" } as any);

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.workExperience.update).not.toHaveBeenCalled();
    });
  });

  describe("addEducation", () => {
    const form = {
      resumeId: "resume-1",
      sectionTitle: "Education",
      institution: "MIT",
      degree: "BSc",
      fieldOfStudy: "CS",
      location: "location-1",
      startDate: new Date("2016-09-01"),
      endDate: new Date("2020-06-01"),
      description: "<p>Studied</p>",
    };

    it("creates an EDUCATION section and maps the education payload", async () => {
      ownsResume();

      const result = await addEducation(form as any);

      expect(result.success).toBe(true);
      expect(
        (prisma.resumeSection.create as any).mock.calls[0][0].data.sectionType,
      ).toBe(SectionType.EDUCATION);
      expect(
        (prisma.resumeSection.update as any).mock.calls[0][0].data.educations
          .create,
      ).toEqual({
        institution: "MIT",
        degree: "BSc",
        fieldOfStudy: "CS",
        locationId: "location-1",
        startDate: form.startDate,
        endDate: form.endDate,
        description: "<p>Studied</p>",
      });
    });

    it("scopes a supplied sectionId to the owned resume", async () => {
      ownsResume();

      await addEducation({
        ...form,
        sectionId: "someone-elses-section",
      } as any);

      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
      expect((prisma.resumeSection.update as any).mock.calls[0][0].where).toEqual(
        { id: "someone-elses-section", resumeId: "resume-1" },
      );
    });

    it("refuses a resume the user does not own", async () => {
      ownsNothing();

      const result = await addEducation(form as any);

      expect(result.success).toBe(false);
      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
    });
  });

  describe("updateEducation", () => {
    it("scopes the update through section -> resume -> profile", async () => {
      (prisma.education.update as any).mockResolvedValue({ id: "edu-1" });

      const result = await updateEducation({
        id: "edu-1",
        resumeId: "resume-1",
        institution: "Stanford",
        degree: "MSc",
        fieldOfStudy: "AI",
        location: "location-2",
        startDate: new Date("2021-09-01"),
        endDate: null,
        description: "<p>Now</p>",
      } as any);

      expect(result.success).toBe(true);
      expect((prisma.education.update as any).mock.calls[0][0].where).toEqual({
        id: "edu-1",
        ResumeSection: { Resume: { profile: { userId: "user-1" } } },
      });
    });
  });

  describe("addCertification", () => {
    const form = {
      resumeId: "resume-1",
      sectionTitle: "Certifications",
      title: "AWS SAA",
      organization: "Amazon",
      issueDate: new Date("2024-01-15"),
      expirationDate: new Date("2027-01-15"),
      credentialUrl: "https://credly.com/badge",
    };

    it("creates a CERTIFICATION section and maps the payload", async () => {
      ownsResume();

      const result = await addCertification(form as any);

      expect(result.success).toBe(true);
      expect(
        (prisma.resumeSection.create as any).mock.calls[0][0].data.sectionType,
      ).toBe(SectionType.CERTIFICATION);
      expect(
        (prisma.resumeSection.update as any).mock.calls[0][0].data
          .licenseOrCertifications.create,
      ).toEqual({
        title: "AWS SAA",
        organization: "Amazon",
        issueDate: form.issueDate,
        expirationDate: form.expirationDate,
        credentialUrl: "https://credly.com/badge",
      });
    });

    it("scopes a supplied sectionId to the owned resume", async () => {
      ownsResume();

      await addCertification({
        ...form,
        sectionId: "someone-elses-section",
      } as any);

      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
      expect((prisma.resumeSection.update as any).mock.calls[0][0].where).toEqual(
        { id: "someone-elses-section", resumeId: "resume-1" },
      );
    });

    it("refuses a resume the user does not own", async () => {
      ownsNothing();

      const result = await addCertification(form as any);

      expect(result.success).toBe(false);
      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
    });
  });

  describe("updateCertification", () => {
    beforeEach(() => {
      (prisma.licenseOrCertification.update as any).mockResolvedValue({
        id: "cert-1",
      });
    });

    it("clears the expiration date when noExpiration is set", async () => {
      const result = await updateCertification({
        id: "cert-1",
        resumeId: "resume-1",
        title: "AWS SAA",
        organization: "Amazon",
        issueDate: new Date("2024-01-15"),
        expirationDate: new Date("2027-01-15"),
        noExpiration: true,
      } as any);

      expect(result.success).toBe(true);
      expect(
        (prisma.licenseOrCertification.update as any).mock.calls[0][0].data
          .expirationDate,
      ).toBeNull();
    });

    it("keeps the expiration date when the certification expires", async () => {
      const expirationDate = new Date("2027-01-15");

      await updateCertification({
        id: "cert-1",
        resumeId: "resume-1",
        title: "AWS SAA",
        organization: "Amazon",
        expirationDate,
        noExpiration: false,
      } as any);

      expect(
        (prisma.licenseOrCertification.update as any).mock.calls[0][0].data
          .expirationDate,
      ).toEqual(expirationDate);
    });

    it("scopes the update through section -> resume -> profile", async () => {
      await updateCertification({
        id: "cert-1",
        resumeId: "resume-1",
        title: "AWS SAA",
        organization: "Amazon",
      } as any);

      expect(
        (prisma.licenseOrCertification.update as any).mock.calls[0][0].where,
      ).toEqual({
        id: "cert-1",
        ResumeSection: { Resume: { profile: { userId: "user-1" } } },
      });
    });
  });

  describe("addSkillsSection", () => {
    const form = {
      resumeId: "resume-1",
      sectionTitle: "Skills",
      categories: [
        { label: "  Languages  ", tagIds: ["tag-1", "tag-2"] },
        { label: "", tagIds: ["tag-3"] },
      ],
    };

    it("flattens categories into skill rows with a continuous order", async () => {
      ownsResume();
      (prisma.resumeSection.create as any).mockResolvedValue({ id: "skills-1" });

      const result = await addSkillsSection(form as any);

      expect(result.success).toBe(true);
      expect((prisma.skill.createMany as any).mock.calls[0][0].data).toEqual([
        {
          tagId: "tag-1",
          category: "Languages",
          order: 0,
          resumeSectionId: "skills-1",
        },
        {
          tagId: "tag-2",
          category: "Languages",
          order: 1,
          resumeSectionId: "skills-1",
        },
        {
          tagId: "tag-3",
          category: null,
          order: 2,
          resumeSectionId: "skills-1",
        },
      ]);
    });

    it("refuses a resume the user does not own", async () => {
      ownsNothing();

      const result = await addSkillsSection(form as any);

      expect(result.success).toBe(false);
      expect(prisma.resumeSection.create).not.toHaveBeenCalled();
      expect(prisma.skill.createMany).not.toHaveBeenCalled();
    });
  });

  describe("updateSkillsSection", () => {
    const form = {
      sectionId: "skills-1",
      resumeId: "resume-1",
      sectionTitle: "Core Skills",
      categories: [{ label: "Cloud", tagIds: ["tag-9"] }],
    };

    it("replaces the skill rows in a single transaction", async () => {
      (prisma.resumeSection.findFirst as any).mockResolvedValue({
        id: "skills-1",
        resumeId: "resume-1",
      });

      const result = await updateSkillsSection(form as any);

      expect(result).toEqual({ success: true });
      expect((prisma.resumeSection.findFirst as any).mock.calls[0][0].where).toEqual(
        {
          id: "skills-1",
          Resume: { profile: { userId: "user-1" } },
        },
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.skill.deleteMany).toHaveBeenCalledWith({
        where: { resumeSectionId: "skills-1" },
      });
      expect((prisma.skill.createMany as any).mock.calls[0][0].data).toEqual([
        {
          tagId: "tag-9",
          category: "Cloud",
          order: 0,
          resumeSectionId: "skills-1",
        },
      ]);
    });

    it("refuses a section the user does not own", async () => {
      (prisma.resumeSection.findFirst as any).mockResolvedValue(null);

      const result = await updateSkillsSection(form as any);

      expect(result).toEqual({
        success: false,
        message: "Section not found or access denied",
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("deleteSkillsSection", () => {
    it("deletes the skills before the section, in one transaction", async () => {
      (prisma.resumeSection.findFirst as any).mockResolvedValue({
        id: "skills-1",
        resumeId: "resume-1",
      });

      const result = await deleteSkillsSection("skills-1");

      expect(result).toEqual({ success: true });
      expect(prisma.skill.deleteMany).toHaveBeenCalledWith({
        where: { resumeSectionId: "skills-1" },
      });
      expect(prisma.resumeSection.delete).toHaveBeenCalledWith({
        where: { id: "skills-1" },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("refuses a section the user does not own", async () => {
      (prisma.resumeSection.findFirst as any).mockResolvedValue(null);

      const result = await deleteSkillsSection("someone-elses-section");

      expect(result).toEqual({
        success: false,
        message: "Section not found or access denied",
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("fails without reading when unauthenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await deleteSkillsSection("skills-1");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.resumeSection.findFirst).not.toHaveBeenCalled();
    });
  });
});
