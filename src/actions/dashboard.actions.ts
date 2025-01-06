import prisma from "@/lib/db";
import { calculatePercentageDifference, getLast7Days } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { Prisma } from "@prisma/client";
import { addMinutes, format, subDays } from "date-fns";

export const getJobsAppliedForPeriod = async (
  daysAgo: number
): Promise<any | undefined> => {
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

export const getRecentJobs = async (): Promise<any | undefined> => {
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
      take: 6,
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getActivityDataForPeriod = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const today = addMinutes(new Date(), 5);
    const sevenDaysAgo = subDays(today, 6);
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
      const day = format(new Date(activity.endTime), "PP");
      const activityTypeLabel = activity.activityType?.label || "Unknown";

      if (!acc[day]) {
        acc[day] = { day: day.split(",")[0] };
      }

      const durationInHours = (activity.duration || 0) / 60;
      acc[day][activityTypeLabel] = (
        (parseFloat(acc[day][activityTypeLabel]) || 0) + durationInHours
      ).toFixed(1);

      return acc;
    }, {});
    const last7Days = getLast7Days();
    const result = last7Days.map((date) => ({
      day: date.split(",")[0],
      ...groupedData[date],
    }));

    return result;
  } catch (error) {
    const msg = "Failed to fetch activities data.";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getJobsActivityForPeriod = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 30);
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
    // Reduce to a format that groups by unique date (YYYY-MM-DD)
    const groupedPosts = jobData.reduce((acc: any, post: any) => {
      const date = format(new Date(post.appliedDate), "PP");
      acc[date] = (acc[date] || 0) + post._count._all;
      return acc;
    }, {});
    // Get the last 7 days
    const last7Days = getLast7Days();
    // Map to ensure all dates are represented with a count of 0 if necessary
    const result = last7Days.map((date) => ({
      day: date.split(",")[0],
      value: groupedPosts[date] || 0,
    }));

    return result;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getActivityCalendarData = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const today = new Date();
    const daysAgo = new Date();
    daysAgo.setDate(today.getDate() - 356);
    const jobData = await prisma.job.groupBy({
      by: "appliedDate",
      _count: {
        _all: true,
      },
      where: {
        userId: user.id,
        applied: true,
        appliedDate: {
          gte: daysAgo, // A year of data
          lte: today,
        },
      },
      orderBy: {
        appliedDate: "asc",
      },
    });

    type InputObject = {
      [key: string]: number;
    };

    type OutputObject = {
      day: string;
      value: number;
    };

    // Reduce to a format that groups by unique date (YYYY-MM-DD)
    const groupedJobs = jobData.reduce((acc: any, job: any) => {
      const date = format(new Date(job.appliedDate), "yyyy-MM-dd");
      acc[date] = (acc[date] || 0) + job._count._all;
      return acc;
    }, {});

    const groupedByYear = Object.entries(groupedJobs).reduce(
      (acc: any, [date, value]) => {
        const year = date.split("-")[0];
        if (!acc[year]) {
          acc[year] = [];
        }
        acc[year].push({ day: date, value });
        return acc;
      },
      {}
    );

    return groupedByYear;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};
