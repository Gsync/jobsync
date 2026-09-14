"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";
import { requireUser, resumeListSelect } from "./shared";
import { createResume } from "./resumeUpload";
import { deleteFile } from "./files";

export const getResumeList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  minSections: number = 0,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const where = { profile: { userId: user.id } };

    const [userRow, total] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { defaultResumeId: true },
      }),
      prisma.resume.count({ where }),
    ]);
    const defaultResumeId = userRow?.defaultResumeId ?? null;

    let rawData;
    if (minSections > 0) {
      // When filtering by section count, Prisma can't express ">= N
      // related rows" in `where`, so fetch all of the user's resumes and
      // filter in JS instead of applying skip/take.
      rawData = await prisma.resume.findMany({
        where,
        select: resumeListSelect,
        orderBy: { createdAt: "desc" },
      });
      if (defaultResumeId) {
        const defaultIndex = rawData.findIndex(
          (r) => r.id === defaultResumeId,
        );
        if (defaultIndex > 0) {
          const [defaultResume] = rawData.splice(defaultIndex, 1);
          rawData.unshift(defaultResume);
        }
      }
    } else if (defaultResumeId) {
      // Pin the default resume to the very first row so it always lands on
      // page 1, then page through the remaining resumes excluding it.
      const restWhere = { ...where, id: { not: defaultResumeId } };
      if (page === 1) {
        const [defaultResume, rest] = await Promise.all([
          prisma.resume.findFirst({
            where: { id: defaultResumeId, ...where },
            select: resumeListSelect,
          }),
          prisma.resume.findMany({
            where: restWhere,
            select: resumeListSelect,
            orderBy: { createdAt: "desc" },
            take: limit - 1,
          }),
        ]);
        rawData = defaultResume ? [defaultResume, ...rest] : rest;
      } else {
        rawData = await prisma.resume.findMany({
          where: restWhere,
          select: resumeListSelect,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit - 1,
          take: limit,
        });
      }
    } else {
      rawData = await prisma.resume.findMany({
        where,
        select: resumeListSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
    }

    const data =
      minSections > 0
        ? rawData.filter((r) => r._count.ResumeSections >= minSections)
        : rawData;

    return { data, total, success: true };
  } catch (error) {
    const msg = "Failed to get resume list.";
    return handleError(error, msg);
  }
};

export const getResumeById = async (
  resumeId: string,
): Promise<any | undefined> => {
  try {
    if (!resumeId) {
      throw new Error("Please provide resume id");
    }
    const user = await requireUser();

    const resume = await prisma.resume.findUnique({
      where: {
        id: resumeId,
        profile: { userId: user.id },
      },
      include: resumeDetailInclude,
    });
    return { data: resume, success: true };
  } catch (error) {
    const msg = "Failed to get resume.";
    return handleError(error, msg);
  }
};

export const saveResumeReviewResult = async (
  resumeId: string,
  reviewData: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await prisma.resume.update({
      where: { id: resumeId, profile: { userId: user.id } },
      data: { reviewData },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to save review result.";
    return handleError(error, msg);
  }
};

// No file here: a create with a file goes through the upload route only
export const createResumeProfile = async (
  title: string,
): Promise<any | undefined> => createResume(title);

// Title only: the file is replaced through the upload route, never from here
export const editResume = async (
  id: string,
  title: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const res = await prisma.resume.update({
      where: { id, profile: { userId: user.id } },
      data: { title },
    });
    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to update resume or file.";
    return handleError(error, msg);
  }
};

export const deleteResumeById = async (
  resumeId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // Verify ownership and get associated fileId
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId: user.id } },
      select: { FileId: true },
    });

    if (!resume) {
      throw new Error("Resume not found or access denied");
    }

    // Delete disk file + DB record before the resume row (avoid orphan on cascade failure)
    if (resume.FileId) {
      await deleteFile(resume.FileId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.contactInfo.deleteMany({ where: { resumeId } });

      await tx.summary.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.workExperience.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.education.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.licenseOrCertification.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.skill.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.resumeSection.deleteMany({ where: { resumeId } });

      await tx.resume.delete({
        where: { id: resumeId, profile: { userId: user.id } },
      });
    });
    return { success: true };
  } catch (error) {
    const msg = "Failed to delete resume.";
    return handleError(error, msg);
  }
};
