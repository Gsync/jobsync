"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "./shared";
import { APP_CONSTANTS } from "@/lib/constants";
import { getReferenceEntityList } from "./referenceList";

export const getJobSourceList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  countBy?: string,
  search?: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    return await getReferenceEntityList({
      model: prisma.jobSource,
      userId: user.id,
      fkField: "jobSourceId",
      appliedRelation: "jobsApplied",
      page,
      limit,
      countBy,
      search,
    });
  } catch (error) {
    const msg = "Failed to fetch job source list. ";
    return handleError(error, msg);
  }
};

export const deleteJobSourceById = async (
  jobSourceId: string
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const jobs = await prisma.job.count({
      where: {
        jobSourceId,
        userId: user.id,
      },
    });

    if (jobs > 0) {
      throw new Error(
        `Job source cannot be deleted due to ${jobs} number of associated jobs! `
      );
    }

    const res = await prisma.jobSource.delete({
      where: {
        id: jobSourceId,
        createdBy: user.id,
      },
    });
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete job source.";
    return handleError(error, msg);
  }
};
