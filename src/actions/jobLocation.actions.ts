"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { ActionResult } from "@/models/actionResult";
import { JobLocation } from "@/models/job.model";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";

export const getAllJobLocations = async (): Promise<JobLocation[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }
    const list = await prisma.location.findMany({
      where: {
        createdBy: user.id,
      },
    });
    return list as unknown as JobLocation[];
  } catch (error) {
    const msg = "Failed to fetch job location list. ";
    return handleError(error, msg) as unknown as JobLocation[];
  }
};

export const getJobLocationsList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  countBy?: string
): Promise<ActionResult<unknown>> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.location.findMany({
        where: {
          createdBy: user.id,
        },
        skip,
        take: limit,
        ...(countBy
          ? {
              select: {
                id: true,
                label: true,
                value: true,
                _count: {
                  select: {
                    jobsApplied: {
                      where: {
                        applied: true,
                      },
                    },
                  },
                },
              },
            }
          : {}),
        orderBy: {
          jobsApplied: {
            _count: "desc",
          },
        },
      }),
      prisma.location.count({
        where: {
          createdBy: user.id,
        },
      }),
    ]);
    return { success: true, data, total };
  } catch (error) {
    const msg = "Failed to fetch job location list. ";
    return handleError(error, msg);
  }
};

export const deleteJobLocationById = async (
  locationId: string
): Promise<ActionResult<unknown>> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const experiences = await prisma.workExperience.count({
      where: {
        locationId,
      },
    });
    if (experiences > 0) {
      throw new Error(
        `Job location cannot be deleted due to its use in experience section of one of the resume! `
      );
    }

    const educations = await prisma.education.count({
      where: {
        locationId,
      },
    });
    if (educations > 0) {
      throw new Error(
        `Job location cannot be deleted due to its use in education section of one of the resume! `
      );
    }

    const jobs = await prisma.job.count({
      where: {
        locationId,
      },
    });

    if (jobs > 0) {
      throw new Error(
        `Location cannot be deleted due to ${jobs} number of associated jobs! `
      );
    }

    const res = await prisma.location.delete({
      where: {
        id: locationId,
        createdBy: user.id,
      },
    });
    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to delete job location.";
    return handleError(error, msg);
  }
};
