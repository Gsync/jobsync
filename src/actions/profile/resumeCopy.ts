"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import {
  buildInsufficientSectionsMessage,
  hasMinResumeSections,
} from "@/lib/resumeSections";
import { buildCopyTitle, ensureUniqueTitle } from "@/lib/resumeCopyTitle";
import { requireUser, resumeCopySelect } from "./shared";

export const getResumeCopyTitleSuggestion = async (
  resumeId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const source = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId: user.id } },
      select: { title: true },
    });
    if (!source) {
      throw new Error("Resume not found or access denied");
    }

    // All titles, not just the current page, so the suggestion never collides
    const existing = await prisma.resume.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });

    return {
      success: true,
      data: buildCopyTitle(
        source.title,
        existing.map((r) => r.title),
      ),
    };
  } catch (error) {
    const msg = "Failed to build a title for the copy.";
    return handleError(error, msg);
  }
};

export const copyResume = async (
  resumeId: string,
  title: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // Read outside the transaction so it stays short
    const source = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId: user.id } },
      select: resumeCopySelect,
    });
    if (!source) {
      throw new Error("Resume not found or access denied");
    }

    if (!hasMinResumeSections(source.ResumeSections.length)) {
      throw new Error(buildInsufficientSectionsMessage("creating a copy"));
    }

    const existing = await prisma.resume.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });
    const uniqueTitle = ensureUniqueTitle(
      title,
      existing.map((r) => r.title),
    );

    const created = await prisma.$transaction(
      async (tx) => {
        const newResume = await tx.resume.create({
          data: { profileId: source.profileId, title: uniqueTitle },
          select: { id: true },
        });

        if (source.ContactInfo) {
          const c = source.ContactInfo;
          await tx.contactInfo.create({
            data: {
              resumeId: newResume.id,
              firstName: c.firstName,
              lastName: c.lastName,
              headline: c.headline,
              email: c.email,
              phone: c.phone,
              address: c.address,
              url1: c.url1,
              url1Label: c.url1Label,
              url2: c.url2,
              url2Label: c.url2Label,
            },
          });
        }

        for (const section of source.ResumeSections) {
          const newSection = await tx.resumeSection.create({
            data: {
              // Connect (not resumeId) because Prisma forbids mixing a scalar
              // FK with the nested summary create below
              Resume: { connect: { id: newResume.id } },
              sectionTitle: section.sectionTitle,
              sectionType: section.sectionType,
              // Summary is 1:1 via summaryId, so nest it with the section
              ...(section.summary
                ? { summary: { create: { content: section.summary.content } } }
                : {}),
            },
            select: { id: true },
          });

          if (section.workExperiences.length > 0) {
            await tx.workExperience.createMany({
              data: section.workExperiences.map((w) => ({
                resumeSectionId: newSection.id,
                companyId: w.companyId,
                jobTitleId: w.jobTitleId,
                locationId: w.locationId,
                startDate: w.startDate,
                endDate: w.endDate,
                description: w.description,
              })),
            });
          }

          if (section.educations.length > 0) {
            await tx.education.createMany({
              data: section.educations.map((e) => ({
                resumeSectionId: newSection.id,
                institution: e.institution,
                degree: e.degree,
                fieldOfStudy: e.fieldOfStudy,
                locationId: e.locationId,
                startDate: e.startDate,
                endDate: e.endDate,
                description: e.description,
              })),
            });
          }

          if (section.licenseOrCertifications.length > 0) {
            await tx.licenseOrCertification.createMany({
              data: section.licenseOrCertifications.map((l) => ({
                resumeSectionId: newSection.id,
                title: l.title,
                organization: l.organization,
                issueDate: l.issueDate,
                expirationDate: l.expirationDate,
                credentialUrl: l.credentialUrl,
              })),
            });
          }

          if (section.others.length > 0) {
            await tx.otherSection.createMany({
              data: section.others.map((o) => ({
                resumeSectionId: newSection.id,
                title: o.title,
                content: o.content,
              })),
            });
          }

          if (section.skills.length > 0) {
            await tx.skill.createMany({
              data: section.skills.map((s) => ({
                resumeSectionId: newSection.id,
                tagId: s.tagId,
                category: s.category,
                order: s.order,
              })),
            });
          }
        }

        return newResume;
      },
      { timeout: 15000 },
    );

    return { success: true, data: { id: created.id, title: uniqueTitle } };
  } catch (error) {
    const msg = "Failed to copy resume.";
    return handleError(error, msg);
  }
};
