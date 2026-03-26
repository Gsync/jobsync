"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";

export const getCoverLetterList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE
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
          createdAt: true,
          updatedAt: true,
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
  content: string
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

    const res = profile?.id
      ? await prisma.coverLetter.create({
          data: {
            profileId: profile.id,
            title,
            content,
          },
        })
      : await prisma.profile.create({
          data: {
            userId: user.id,
            coverLetters: {
              create: [{ title, content }],
            },
          },
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
  content: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const res = await prisma.coverLetter.update({
      where: { id },
      data: { title, content },
    });

    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to update cover letter.";
    return handleError(error, msg);
  }
};

export const deleteCoverLetterById = async (
  coverLetterId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    await prisma.coverLetter.delete({
      where: { id: coverLetterId },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to delete cover letter.";
    return handleError(error, msg);
  }
};
