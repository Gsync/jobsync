"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";

export const getAllJobTitles = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }
    const list = await prisma.jobTitle.findMany({
      where: {
        createdBy: user?.id,
      },
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch job title list. ";
    return handleError(error, msg);
  }
};

export const getJobTitleList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  countBy?: string,
  search?: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const skip = (page - 1) * limit;

    const whereClause: any = {
      createdBy: user.id,
    };

    if (search) {
      whereClause.label = { contains: search };
    }

    const [data, total, totalCounts] = await Promise.all([
      prisma.jobTitle.findMany({
        where: whereClause,
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
                    jobs: {
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
          jobs: {
            _count: "desc",
          },
        },
      }),
      prisma.jobTitle.count({
        where: whereClause,
      }),
      countBy
        ? prisma.job.groupBy({
            by: ["jobTitleId"],
            where: {
              userId: user.id,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const totalMap = new Map(
      (totalCounts as { jobTitleId: string; _count: { id: number } }[]).map(
        (r) => [r.jobTitleId, r._count.id],
      ),
    );

    const dataWithTotal = countBy
      ? (data as any[]).map((title) => ({
          ...title,
          _count: {
            ...(title._count ?? {}),
            jobsTotal: totalMap.get(title.id) ?? 0,
          },
        }))
      : data;

    return { data: dataWithTotal, total };
  } catch (error) {
    const msg = "Failed to fetch job title list. ";
    return handleError(error, msg);
  }
};

export const createJobTitle = async (
  label: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const value = canonicalizeEntityValue(label.trim());

    const upsertedTitle = await prisma.jobTitle.upsert({
      where: { value_createdBy: { value, createdBy: user.id } },
      update: { label },
      create: { label, value, createdBy: user.id },
    });

    return upsertedTitle;
  } catch (error) {
    const msg = "Failed to create job title. ";
    return handleError(error, msg);
  }
};

export const deleteJobTitleById = async (
  jobTitleId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const experiences = await prisma.workExperience.count({
      where: {
        jobTitleId,
      },
    });
    if (experiences > 0) {
      throw new Error(
        `Job title cannot be deleted due to its use in experience section of one of the resume! `
      );
    }
    const jobs = await prisma.job.count({
      where: {
        jobTitleId,
        userId: user.id,
      },
    });

    if (jobs > 0) {
      throw new Error(
        `Job title cannot be deleted due to ${jobs} number of associated jobs! `
      );
    }

    const res = await prisma.jobTitle.delete({
      where: {
        id: jobTitleId,
        createdBy: user.id,
      },
    });
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete job title.";
    return handleError(error, msg);
  }
};
