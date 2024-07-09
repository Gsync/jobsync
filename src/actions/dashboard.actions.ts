import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { format, subDays } from "date-fns";

export const getJobsAppliedForPeriod = async (
  daysAgo: number
): Promise<any | undefined> => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  try {
    const startDate = subDays(new Date(), daysAgo);
    const endDate = new Date();

    const count = await prisma.job.count({
      where: {
        userId: user.id,
        applied: true,
        appliedDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    return count;
  } catch (error) {
    const msg = "Failed to job count for this week ";
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

// Helper function to get an array of dates for the last 7 days
const getLast7Days = (dateType = "PP") => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(format(date, dateType));
  }
  return dates;
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

    const convertToDateValueArray = (input: InputObject): OutputObject[] => {
      return Object.entries(input).map(([key, value]) => ({
        day: key,
        value: value,
      }));
    };

    const result = convertToDateValueArray(groupedJobs);

    return result;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};
