"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "../shared";
import { STAGE_DETAIL_INCLUDE, sortStages } from "./shared";

export const getJobStages = async (
  jobId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const stages = await prisma.jobStage.findMany({
      where: { jobId, Job: { userId: user.id } },
      include: STAGE_DETAIL_INCLUDE,
    });
    return sortStages(stages);
  } catch (error) {
    return handleError(error, "Failed to fetch job stages. ");
  }
};
