import { APP_CONSTANTS } from "@/lib/constants";
import prisma from "@/lib/db";
import { formatISODate, formatWeekdayDate, getUserLocale } from "@/i18n/server";
import { calculatePercentageDifference, getLast7Days } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { Prisma } from "@prisma/client";
import { subDays } from "date-fns";

export const getJobsAppliedForPeriod = async (
  daysAgo: number,
): Promise<{ count: number; trend: number | null }> => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  try {
    const startDate1 = subDays(new Date(), daysAgo);
    const startDate2 = subDays(new Date(), daysAgo * 2);
    const endDate = new Date();
    const query = (date: Date): Prisma.JobCountArgs => ({
      where: {
        userId: user.id,
        applied: true,
        appliedDate: {
          gte: date,
          lt: endDate,
        },
      },
    });

    const [count, count2] = await prisma.$transaction([
      prisma.job.count(query(startDate1)),
      prisma.job.count(query(startDate2)),
    ]);
    const difference = Math.abs(count2 - count);
    const trend = calculatePercentageDifference(difference, count);
    return { count, trend };
  } catch (error) {
    const msg = "Failed to calculate job count";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getRecentJobs = async (): Promise<any[]> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
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
      orderBy: {
        appliedDate: "desc",
      },
      take: APP_CONSTANTS.RECENT_NUM_JOBS_ACTIVITIES,
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getActivityDataForPeriod = async (): Promise<Record<string, any>[]> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const now = new Date();
    // Use local time for date range to match grouping and getLast7Days
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0,
    );
    const activities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        endTime: {
          gte: sevenDaysAgo,
          lte: today,
        },
      },
      select: {
        endTime: true,
        duration: true,
        activityType: {
          select: {
            label: true,
          },
        },
      },
      orderBy: {
        endTime: "asc",
      },
    });
    const groupedData = activities.reduce((acc: any, activity: any) => {
      // Use local date for grouping to match user's perception
      const activityDate = new Date(activity.endTime);
      const day = formatISODate(activityDate);
      const activityTypeLabel = activity.activityType?.label || "Unknown";

      if (!acc[day]) {
        acc[day] = {};
      }

      const durationInHours = (activity.duration || 0) / 60;
      acc[day][activityTypeLabel] =
        (acc[day][activityTypeLabel] || 0) + durationInHours;

      return acc;
    }, {});
    const last7Days = getLast7Days("yyyy-MM-dd");
    const locale = await getUserLocale();
    const result = last7Days.map((dateStr) => ({
      day: formatWeekdayDate(dateStr, locale),
      ...groupedData[dateStr],
    }));
    return result;
  } catch (error) {
    const msg = "Failed to fetch activities data.";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getJobsActivityForPeriod = async (): Promise<{ day: string; value: number }[]> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const now = new Date();
    // Use local time for date range to match grouping and getLast7Days
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0,
    );
    const jobData = await prisma.job.groupBy({
      by: "appliedDate",
      _count: {
        _all: true,
      },
      where: {
        userId: user.id,
        applied: true,
        appliedDate: {
          gte: sevenDaysAgo,
          lte: today,
        },
      },
      orderBy: {
        appliedDate: "asc",
      },
    });
    // Reduce to a format that groups by unique date (YYYY-MM-DD) using local time
    const groupedPosts = jobData.reduce((acc: any, post: any) => {
      if (!post.appliedDate) return acc;
      const date = formatISODate(new Date(post.appliedDate));
      acc[date] = (acc[date] || 0) + post._count._all;
      return acc;
    }, {});
    // Get the last 7 days in local time
    const last7Days = getLast7Days("yyyy-MM-dd");
    // Map to ensure all dates are represented with a count of 0 if necessary
    const locale = await getUserLocale();
    const result = last7Days.map((dateStr) => ({
      day: formatWeekdayDate(dateStr, locale),
      value: groupedPosts[dateStr] || 0,
    }));

    return result;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export interface TopActivityType {
  label: string;
  hours: number;
}

export const getTopActivityTypesByDuration = async (
  daysAgo: number,
): Promise<TopActivityType[]> => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  try {
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysAgo + 1,
      0,
      0,
      0,
      0,
    );

    const activities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        endTime: {
          gte: startDate,
          lte: today,
        },
      },
      select: {
        duration: true,
        activityType: {
          select: {
            label: true,
          },
        },
      },
    });

    const groupedByType = activities.reduce(
      (acc: Record<string, number>, activity) => {
        const label = activity.activityType?.label || "Unknown";
        const durationInHours = (activity.duration || 0) / 60;
        acc[label] = (acc[label] || 0) + durationInHours;
        return acc;
      },
      {},
    );

    const sorted = Object.entries(groupedByType)
      .map(([label, hours]) => ({ label, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 3);

    return sorted;
  } catch (error) {
    const msg = "Failed to fetch top activity types";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getRecentActivities = async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
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

export const getActivityCalendarData = async (): Promise<Record<string, { day: string; value: number; hours: number }[]>> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const now = new Date();
    // Use local time for date range to match grouping
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const daysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 365,
      0,
      0,
      0,
      0,
    );
    const jobData = await prisma.job.groupBy({
      by: "appliedDate",
      _count: {
        _all: true,
      },
      where: {
        userId: user.id,
        applied: true,
        appliedDate: {
          gte: daysAgo,
          lte: today,
        },
      },
      orderBy: {
        appliedDate: "asc",
      },
    });

    const activityData = await prisma.activity.findMany({
      where: {
        userId: user.id,
        startTime: { gte: daysAgo, lte: today },
        duration: { not: null },
      },
      select: { startTime: true, duration: true },
    });

    const groupedJobs: Record<string, number> = jobData.reduce(
      (acc: Record<string, number>, job: any) => {
        if (!job.appliedDate) return acc;
        const date = formatISODate(new Date(job.appliedDate));
        acc[date] = (acc[date] || 0) + job._count._all;
        return acc;
      },
      {},
    );

    const groupedHours: Record<string, number> = activityData.reduce(
      (acc: Record<string, number>, activity) => {
        const date = formatISODate(new Date(activity.startTime));
        acc[date] = (acc[date] || 0) + (activity.duration || 0) / 60;
        return acc;
      },
      {},
    );

    const allDates = new Set([
      ...Object.keys(groupedJobs),
      ...Object.keys(groupedHours),
    ]);

    const groupedByYear = [...allDates].reduce(
      (acc: Record<string, any[]>, date) => {
        const year = date.split("-")[0];
        if (!acc[year]) acc[year] = [];
        acc[year].push({
          day: date,
          value: groupedJobs[date] || 0,
          hours: Math.round((groupedHours[date] || 0) * 10) / 10,
        });
        return acc;
      },
      {},
    );

    return groupedByYear;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};
