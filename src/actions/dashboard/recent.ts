import { APP_CONSTANTS } from "@/lib/constants";
import prisma from "@/lib/db";
import { requireUser } from "../shared";

export const getRecentJobs = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const list = await prisma.job.findMany({
      where: {
        userId: user.id,
        applied: true,
      },
      include: {
        JobSource: true,
        JobTitle: true,
        Company: true,
        Status: true,
        Location: true,
      },
      orderBy: [
        { appliedDate: { sort: "desc", nulls: "last" } },
        { id: "desc" },
      ],
      take: APP_CONSTANTS.RECENT_NUM_JOBS_ACTIVITIES,
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getRecentActivities = async () => {
  try {
    const user = await requireUser();
    const list = await prisma.activity.findMany({
      where: {
        userId: user.id,
        endTime: { not: null },
      },
      include: {
        activityType: true,
      },
      orderBy: {
        endTime: "desc",
      },
      take: APP_CONSTANTS.RECENT_NUM_JOBS_ACTIVITIES,
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch recent activities.";
    console.error(msg, error);
    throw new Error(msg);
  }
};
