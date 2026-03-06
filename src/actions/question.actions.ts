"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { AddQuestionFormSchema } from "@/models/addQuestionForm.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { z } from "zod";

export const getQuestionsList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  filter?: string,
  search?: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const offset = (page - 1) * limit;

    const whereClause: any = {
      createdBy: user.id,
    };

    if (filter) {
      whereClause.tags = { some: { id: filter } };
    }

    if (search) {
      whereClause.OR = [
        { question: { contains: search } },
        { answer: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.question.findMany({
        where: whereClause,
        include: {
          tags: true,
        },
        orderBy: [{ createdAt: "desc" }],
        skip: offset,
        take: limit,
      }),
      prisma.question.count({ where: whereClause }),
    ]);

    return { success: true, data, total };
  } catch (error) {
    return handleError(error, "Failed to fetch questions list.");
  }
};

export const getQuestionById = async (
  questionId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const question = await prisma.question.findFirst({
      where: { id: questionId, createdBy: user.id },
      include: { tags: true },
    });

    if (!question) {
      return { success: false, message: "Question not found" };
    }

    return { success: true, data: question };
  } catch (error) {
    return handleError(error, "Failed to fetch question.");
  }
};

export const createQuestion = async (
  data: z.infer<typeof AddQuestionFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const validatedData = AddQuestionFormSchema.parse(data);

    const question = await prisma.question.create({
      data: {
        question: validatedData.question,
        answer: validatedData.answer || null,
        createdBy: user.id,
        tags: validatedData.tagIds?.length
          ? { connect: validatedData.tagIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { tags: true },
    });

    return { success: true, data: question };
  } catch (error) {
    return handleError(error, "Failed to create question.");
  }
};

export const updateQuestion = async (
  data: z.infer<typeof AddQuestionFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    if (!data.id) throw new Error("Question ID is required for update");

    const validatedData = AddQuestionFormSchema.parse(data);

    const question = await prisma.question.update({
      where: { id: data.id, createdBy: user.id },
      data: {
        question: validatedData.question,
        answer: validatedData.answer || null,
        tags: {
          set: validatedData.tagIds?.map((id) => ({ id })) || [],
        },
      },
      include: { tags: true },
    });

    return { success: true, data: question };
  } catch (error) {
    return handleError(error, "Failed to update question.");
  }
};

export const deleteQuestion = async (
  questionId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await prisma.question.delete({
      where: { id: questionId, createdBy: user.id },
    });

    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to delete question.");
  }
};

export const getTagsWithQuestionCounts = async (): Promise<
  any | undefined
> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const tags = await prisma.tag.findMany({
      where: { createdBy: user.id },
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { label: "asc" },
    });

    const data = tags
      .filter((tag) => tag._count.questions > 0)
      .map((tag) => ({
        id: tag.id,
        label: tag.label,
        value: tag.value,
        questionCount: tag._count.questions,
      }));

    const totalQuestions = await prisma.question.count({
      where: { createdBy: user.id },
    });

    return { success: true, data, totalQuestions };
  } catch (error) {
    return handleError(error, "Failed to fetch tags with question counts.");
  }
};
