import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { format } from "date-fns";

const getStartOfWeek = (date: Date) => {
  const currentDate = new Date(date);
  const day = currentDate.getDay();
  const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(currentDate.setDate(diff));
};

const getEndOfWeek = (startOfWeek: Date) => {
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Add 6 days to get to Sunday
  return endOfWeek;
};

const getDateNDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

export const getJobsAppliedForPeriod = async (
  daysAgo: number
): Promise<any | undefined> => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  try {
    const startDate = getDateNDaysAgo(daysAgo);
    const endDate = new Date(); // Current date and time

    const count = await prisma.job.count({
      where: {
        userId: user.id,
        Status: {
          value: "applied",
        },
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

export const getJobsAppliedThisWeek = async (): Promise<any | undefined> => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }
  const startOfWeek = getStartOfWeek(new Date());
  const endOfWeek = getEndOfWeek(startOfWeek);

  try {
    const count = await prisma.job.count({
      where: {
        userId: user.id,
        Status: {
          value: "applied",
        },
        appliedDate: {
          gte: startOfWeek,
          lt: new Date(endOfWeek.setDate(endOfWeek.getDate() + 1)), // Add 1 to include the end of the week
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
        Status: {
          value: "applied",
        },
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
      take: 5,
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

// Helper function to get an array of dates for the last 7 days
const getLast7Days = () => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(format(date, "PP"));
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
    sevenDaysAgo.setDate(today.getDate() - 7);
    const jobData = await prisma.job.groupBy({
      by: "appliedDate",
      _count: {
        _all: true,
      },
      where: {
        userId: user.id,
        Status: {
          value: "applied",
        },
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
      date: date.split(",")[0],
      jobs: groupedPosts[date] || 0,
    }));

    return result;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};
