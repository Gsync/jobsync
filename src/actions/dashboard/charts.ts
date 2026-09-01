import prisma from "@/lib/db";
import { getLast7Days } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { OTHER_SLICE_ID } from "@/components/dashboard/jobsActivityChart";
import { requireUser } from "../shared";
import { getLocalDayRange, roundToTenth } from "./shared";

export const getActivityDataForPeriod = async (): Promise<{
  data: any[];
  keys: string[];
}> => {
  try {
    const user = await requireUser();
    // Use local time for date range to match grouping and getLast7Days
    const { start: sevenDaysAgo, end: today } = getLocalDayRange(6);
    const activities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        startTime: {
          gte: sevenDaysAgo,
          lte: today,
        },
      },
      select: {
        startTime: true,
        duration: true,
        activityType: {
          select: {
            label: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });
    const groupedData = activities.reduce((acc: any, activity: any) => {
      // Use local date for grouping to match user's perception
      const activityDate = new Date(activity.startTime);
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

    // Cap to the top 3 activity types by total weekly hours, matching the
    // donut card's ranking, and fold the rest into "Other" per day.
    const totalsByLabel: Record<string, number> = {};
    for (const dayTotals of Object.values(groupedData) as Record<
      string,
      number
    >[]) {
      for (const [label, hours] of Object.entries(dayTotals)) {
        totalsByLabel[label] = (totalsByLabel[label] || 0) + hours;
      }
    }
    const topLabels = Object.entries(totalsByLabel)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);
    const hasOther = Object.keys(totalsByLabel).some(
      (label) => !topLabels.includes(label),
    );
    const keys = hasOther ? [...topLabels, OTHER_SLICE_ID] : topLabels;

    const last7Days = getLast7Days("yyyy-MM-dd");
    const data = last7Days.map((dateStr) => {
      const dayTotals: Record<string, number> = groupedData[dateStr] || {};
      const entry: Record<string, any> = {
        day: format(parseISO(dateStr), "EEE, MMM d"),
      };
      for (const label of topLabels) {
        if (dayTotals[label]) entry[label] = dayTotals[label];
      }
      if (hasOther) {
        const otherBreakdown = Object.entries(dayTotals)
          .filter(([label]) => !topLabels.includes(label))
          .map(([label, hours]) => ({ label, hours: roundToTenth(hours) }))
          .filter((entry) => entry.hours > 0)
          .sort((a, b) => b.hours - a.hours);
        const otherHours = otherBreakdown.reduce(
          (sum, entry) => sum + entry.hours,
          0,
        );
        if (otherHours) {
          entry[OTHER_SLICE_ID] = otherHours;
          entry.otherBreakdown = otherBreakdown;
        }
      }
      return entry;
    });

    return { data, keys };
  } catch (error) {
    const msg = "Failed to fetch activities data.";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getJobsActivityForPeriod = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    // Use local time for date range to match grouping and getLast7Days
    const { start: sevenDaysAgo, end: today } = getLocalDayRange(6);
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
    const user = await requireUser();
    // Use local time for date range to match grouping
    const { start: daysAgo, end: today } = getLocalDayRange(365);
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
        const date = format(new Date(job.appliedDate), "yyyy-MM-dd");
        acc[date] = (acc[date] || 0) + job._count._all;
        return acc;
      },
      {},
    );

    const groupedHours: Record<string, number> = activityData.reduce(
      (acc: Record<string, number>, activity) => {
        const date = format(new Date(activity.startTime), "yyyy-MM-dd");
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
