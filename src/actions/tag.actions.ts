"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";

export const getAllTags = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }
    const list = await prisma.tag.findMany({
      where: { createdBy: user.id },
      orderBy: { label: "asc" },
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch tag list. ";
    return handleError(error, msg);
  }
};

export const getTagList = async (
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
      prisma.tag.findMany({
        where: { createdBy: user.id },
        skip,
        take: limit,
        select: {
          id: true,
          label: true,
          value: true,
          _count: { select: { jobs: true, questions: true } },
        },
        orderBy: { label: "asc" },
      }),
      prisma.tag.count({ where: { createdBy: user.id } }),
    ]);

    return { data, total };
  } catch (error) {
    const msg = "Failed to fetch tag list. ";
    return handleError(error, msg);
  }
};

export const createTag = async (label: string): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const trimmed = label.trim();
    if (!trimmed) {
      throw new Error("Tag label cannot be empty.");
    }

    const value = trimmed.toLowerCase();

    const tag = await prisma.tag.upsert({
      where: { value_createdBy: { value, createdBy: user.id } },
      update: {},
      create: { label: trimmed, value, createdBy: user.id },
    });

    return { data: tag, success: true };
  } catch (error) {
    const msg = "Failed to create tag. ";
    return handleError(error, msg);
  }
};

export const deleteTagById = async (
  tagId: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const [jobs, questions] = await Promise.all([
      prisma.job.count({ where: { tags: { some: { id: tagId } } } }),
      prisma.question.count({ where: { tags: { some: { id: tagId } } } }),
    ]);

    if (jobs > 0 || questions > 0) {
      const links = [
        jobs > 0 ? `${jobs} job(s)` : "",
        questions > 0 ? `${questions} question(s)` : "",
      ]
        .filter(Boolean)
        .join(" and ");

      throw new Error(
        `Skill tag cannot be deleted because it is linked to ${links}.`,
      );
    }

    const res = await prisma.tag.delete({
      where: { id: tagId, createdBy: user.id },
    });

    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete tag.";
    return handleError(error, msg);
  }
};
