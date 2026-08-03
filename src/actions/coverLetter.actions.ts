"use server";
import MarkdownIt from "markdown-it";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { buildCoverLetterTitle } from "@/lib/coverLetterTitle";
import { deleteFile } from "@/actions/profile.actions";

// html:false escapes raw HTML in the model output before it is ever stored,
// so the saved document is the same shape a hand-written letter produces.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

const MIN_CONTENT_LENGTH = 10;

const createCoverLetterFileEntry = async (
  fileName: string,
  filePath: string,
) => {
  const entry = await prisma.file.create({
    data: {
      fileName,
      filePath,
      fileType: "cover-letter",
    },
  });
  return entry.id;
};

export const getCoverLetterList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.coverLetter.findMany({
        where: {
          profile: {
            userId: user.id,
          },
        },
        skip,
        take: limit,
        select: {
          id: true,
          profileId: true,
          title: true,
          content: true,
          FileId: true,
          createdAt: true,
          updatedAt: true,
          File: {
            select: {
              id: true,
              fileName: true,
              filePath: true,
              fileType: true,
            },
          },
          _count: {
            select: {
              Job: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.coverLetter.count({
        where: {
          profile: {
            userId: user.id,
          },
        },
      }),
    ]);
    return { data, total, success: true };
  } catch (error) {
    const msg = "Failed to get cover letter list.";
    return handleError(error, msg);
  }
};

export const createCoverLetter = async (
  title: string,
  content: string,
  fileName?: string | null,
  filePath?: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const value = title.trim().toLowerCase();
    const titleExists = await prisma.coverLetter.findFirst({
      where: {
        title: value,
        profile: {
          userId: user.id,
        },
      },
    });

    if (titleExists) {
      throw new Error("Cover letter title already exists!");
    }

    const profile = await prisma.profile.findFirst({
      where: {
        userId: user.id,
      },
    });

    const fileId =
      fileName && filePath
        ? await createCoverLetterFileEntry(fileName, filePath)
        : null;
    const normalizedContent = content?.trim() ? content : "";

    const res = profile?.id
      ? await prisma.coverLetter.create({
          data: {
            profileId: profile.id,
            title,
            content: normalizedContent,
            FileId: fileId,
          },
        })
      : await prisma.profile.create({
          data: {
            userId: user.id,
            coverLetters: {
              create: [
                {
                  title,
                  content: normalizedContent,
                  FileId: fileId,
                },
              ],
            },
          },
          include: { coverLetters: { select: { id: true } } },
        });

    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to create cover letter.";
    return handleError(error, msg);
  }
};

export const updateCoverLetter = async (
  id: string,
  title: string,
  content: string,
  fileId?: string,
  fileName?: string,
  filePath?: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    let resolvedFileId = fileId;

    if (!fileId && fileName && filePath) {
      resolvedFileId = await createCoverLetterFileEntry(fileName, filePath);
    }

    const data: {
      title: string;
      content: string;
      FileId?: string | null;
    } = {
      title,
      content: content?.trim() ? content : "",
    };

    // Only touch FileId when a new file was uploaded or an existing id is kept.
    if (fileName && filePath) {
      data.FileId = resolvedFileId || null;
    } else if (fileId !== undefined) {
      data.FileId = resolvedFileId || null;
    }

    const res = await prisma.coverLetter.update({
      where: { id, profile: { userId: user.id } },
      data,
    });

    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to update cover letter.";
    return handleError(error, msg);
  }
};

export const deleteCoverLetterById = async (
  coverLetterId: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const coverLetter = await prisma.coverLetter.findUnique({
      where: { id: coverLetterId, profile: { userId: user.id } },
      select: { FileId: true },
    });

    if (!coverLetter) {
      throw new Error("Cover letter not found or access denied");
    }

    if (coverLetter.FileId) {
      await deleteFile(coverLetter.FileId);
    }

    await prisma.coverLetter.delete({
      where: { id: coverLetterId, profile: { userId: user.id } },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to delete cover letter.";
    return handleError(error, msg);
  }
};

export const generateCoverLetterForJob = async (
  jobId: string,
  markdown: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    if (!markdown || markdown.trim().length < MIN_CONTENT_LENGTH) {
      throw new Error("Generated cover letter was too short to save.");
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId, userId: user.id },
      include: { JobTitle: true, Company: true },
    });

    if (!job) {
      throw new Error("Job not found");
    }

    const profile = await prisma.profile.findFirst({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new Error("No profile found for this user.");
    }

    const existing = await prisma.coverLetter.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });

    const title = buildCoverLetterTitle(
      job.JobTitle?.label ?? "Cover Letter",
      job.Company?.label ?? "",
      existing.map((letter) => letter.title),
    );

    const content = md.render(markdown);

    const created = await prisma.$transaction(async (tx) => {
      const letter = await tx.coverLetter.create({
        data: { profileId: profile.id, title, content },
      });

      await tx.job.update({
        where: { id: jobId, userId: user.id },
        data: { coverLetterId: letter.id },
      });

      return letter;
    });

    return { success: true, data: { id: created.id, title: created.title } };
  } catch (error) {
    const msg = "Failed to save generated cover letter.";
    return handleError(error, msg);
  }
};
