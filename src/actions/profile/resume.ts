"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";
import { createFileEntry, requireUser, resumeListSelect } from "./shared";
import { deleteFile } from "./files";

export const getResumeList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  minSections: number = 0,
  // File-backed resumes can be matched by consumers that extract their file
  // text (currently automation); other consumers keep the structured-only
  // behavior by default.
  includeFileBacked: boolean = false,
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
        ? rawData.filter(
            (r) =>
              r._count.ResumeSections >= minSections ||
              (includeFileBacked && Boolean(r.FileId)),
          )
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

export const createResumeProfile = async (
  title: string,
  fileName: string,
  filePath?: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // Build a unique title: if base title is taken, append (2), (3), …
    const existingTitles = await prisma.resume.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });
    const taken = new Set(existingTitles.map((r) => r.title.toLowerCase()));
    const base = title.trim();
    let uniqueTitle = base;
    let counter = 2;
    while (taken.has(uniqueTitle.toLowerCase())) {
      uniqueTitle = `${base} (${counter++})`;
    }

    // Count before creating so we can auto-default the user's first resume.
    const resumeCount = await prisma.resume.count({
      where: { profile: { userId: user.id } },
    });

    const profile = await prisma.profile.findFirst({
      where: {
        userId: user.id,
      },
    });

    let res: any;
    let createdResumeId: string;
    if (profile && profile.id) {
      res = await prisma.resume.create({
        data: {
          profileId: profile!.id,
          title: uniqueTitle,
          FileId: fileName ? await createFileEntry(fileName, filePath) : null,
        },
      });
      createdResumeId = res.id;
    } else {
      // No profile yet: profile.create returns the profile, so pull the
      // created resume's id from the nested include.
      res = await prisma.profile.create({
        data: {
          userId: user.id,
          resumes: {
            create: [
              {
                title: uniqueTitle,
                FileId: fileName
                  ? await createFileEntry(fileName, filePath)
                  : null,
              },
            ],
          },
        },
        include: { resumes: { select: { id: true } } },
      });
      createdResumeId = res.resumes[0].id;
    }

    // Auto-default only the user's very first resume (decision #4/#5).
    if (resumeCount === 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultResumeId: createdResumeId },
      });
    }
    // revalidatePath("/dashboard/myjobs", "page");
    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to create resume.";
    return handleError(error, msg);
  }
};

export const editResume = async (
  id: string,
  title: string,
  fileId?: string,
  fileName?: string,
  filePath?: string,
): Promise<any | undefined> => {
  try {
    let resolvedFileId = fileId;

    if (!fileId && fileName && filePath) {
      resolvedFileId = await createFileEntry(fileName, filePath);
    }

    if (resolvedFileId) {
      const isValidFileId = await prisma.file.findFirst({
        where: { id: resolvedFileId },
      });

      if (!isValidFileId) {
        throw new Error(
          `The provided FileId "${resolvedFileId}" does not exist.`,
        );
      }
    }

    const user = await requireUser();

    const res = await prisma.resume.update({
      where: { id, profile: { userId: user.id } },
      data: {
        title,
        FileId: resolvedFileId || null,
      },
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
