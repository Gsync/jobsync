"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";

export const getJobSourceList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  countBy?: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const skip = (page - 1) * limit;

    const [data, total, totalCounts] = await Promise.all([
      prisma.jobSource.findMany({
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
      prisma.jobSource.count({
        where: {
          createdBy: user.id,
        },
      }),
      countBy
        ? prisma.job.groupBy({
            by: ["jobSourceId"],
            where: {
              userId: user.id,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const totalMap = new Map(
      (totalCounts as { jobSourceId: string; _count: { id: number } }[]).map(
        (r) => [r.jobSourceId, r._count.id],
      ),
    );

    const dataWithTotal = countBy
      ? (data as any[]).map((source) => ({
          ...source,
          _count: {
            ...(source._count ?? {}),
            jobsTotal: totalMap.get(source.id) ?? 0,
          },
        }))
      : data;

    return { data: dataWithTotal, total };
  } catch (error) {
    const msg = "Failed to fetch job source list. ";
    return handleError(error, msg);
  }
};

export const deleteJobSourceById = async (
  jobSourceId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

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
