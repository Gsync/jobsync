import prisma from "@/lib/db";
import { calculatePercentageDifference, getLast7Days } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { Prisma } from "@prisma/client";
import { format, parseISO, subDays } from "date-fns";

export const getJobsAppliedForPeriod = async (
  daysAgo: number,
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
      const day = format(activityDate, "yyyy-MM-dd");
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
    const result = last7Days.map((dateStr) => ({
      day: format(parseISO(dateStr), "EEE, MMM d"),
      ...groupedData[dateStr],
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
      const date = format(new Date(post.appliedDate), "yyyy-MM-dd");
      acc[date] = (acc[date] || 0) + post._count._all;
      return acc;
    }, {});
    // Get the last 7 days in local time
    const last7Days = getLast7Days("yyyy-MM-dd");
    // Map to ensure all dates are represented with a count of 0 if necessary
    const result = last7Days.map((dateStr) => ({
      day: format(parseISO(dateStr), "EEE, MMM d"),
      value: groupedPosts[dateStr] || 0,
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
      {},
    );

    return groupedByYear;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};
