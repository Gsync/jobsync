"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "../shared";
import { assertInterviewStage, assertStageOwned } from "./shared";

const PREP_INCLUDE = {
  Question: { select: { id: true, question: true, tags: true } },
};

export const addStagePrepQuestions = async (
  stageId: string,
  questionIds: string[],
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const ids = [...new Set(questionIds)].filter(Boolean);
    if (ids.length === 0) throw new Error("Pick at least one question");

    const [stage, owned] = await Promise.all([
      assertStageOwned(stageId, user.id),
      prisma.question.count({
        where: { id: { in: ids }, createdBy: user.id },
      }),
    ]);
    // Kind before ownership: the stage is already known to be the caller's,
    // and "Applied is not an interview stage" is the message that helps.
    assertInterviewStage(stage);
    if (owned !== ids.length) throw new Error("Question not found");

    // The unique index skips already-linked ids, even under concurrent adds.
    await prisma.jobStagePrepQuestion.createMany({
      data: ids.map((questionId) => ({ stageId, questionId, asked: false })),
      skipDuplicates: true,
    });

    const data = await prisma.jobStagePrepQuestion.findMany({
      where: { stageId },
      include: PREP_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data };
  } catch (error) {
    return handleError(error, "Failed to add questions to the prep list.");
  }
};

export const removeStagePrepQuestion = async (
  linkId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const res = await prisma.jobStagePrepQuestion.deleteMany({
      where: {
        id: linkId,
        Stage: { Job: { userId: user.id } },
        Question: { createdBy: user.id },
      },
    });
    if (res.count === 0) throw new Error("Prep question not found");
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to remove the prep question.");
  }
};

export const setPrepQuestionAsked = async (
  linkId: string,
  asked: boolean,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const res = await prisma.jobStagePrepQuestion.updateMany({
      where: {
        id: linkId,
        Stage: { Job: { userId: user.id } },
        Question: { createdBy: user.id },
      },
      data: { asked, askedAt: asked ? new Date() : null },
    });
    if (res.count === 0) throw new Error("Prep question not found");

    const data = await prisma.jobStagePrepQuestion.findFirst({
      where: { id: linkId },
      select: { id: true, asked: true, askedAt: true },
    });
    return { success: true, data };
  } catch (error) {
    return handleError(error, "Failed to update the prep question.");
  }
};
