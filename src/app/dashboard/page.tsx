import { format } from "date-fns";
import {
  getActivityCalendarData,
  getActivityDataForPeriod,
  getJobsActivityForPeriod,
  getJobsActivitySummary,
  getRecentActivities,
  getRecentJobs,
} from "@/actions/dashboard.actions";
import {
  getDailyGoalValues,
  getGoalStreaks,
} from "@/actions/dailyGoals.actions";
import ActivityCalendar from "@/components/dashboard/ActivityCalendar";
import DailyGoalsCalendar from "@/components/dashboard/DailyGoalsCalendar";
import JobsActivityCard from "@/components/dashboard/JobsActivityCard";
import JobsApplied from "@/components/dashboard/JobsAppliedCard";
import RecentCardToggle from "@/components/dashboard/RecentCardToggle";
import WeeklyBarChartToggle from "@/components/dashboard/WeeklyBarChartToggle";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Dashboard() {
  // Server-computed so server and browser agree on "today"
  const today = format(new Date(), "yyyy-MM-dd");
  const [
    summary7Days,
    summary30Days,
    recentJobs,
    recentActivities,
    weeklyData,
    activitiesData,
    activityCalendarData,
    dailyGoals,
    goalStreaks,
  ] = await Promise.all([
    getJobsActivitySummary(7),
    getJobsActivitySummary(30),
    getRecentJobs(),
    getRecentActivities(),
    getJobsActivityForPeriod(),
    getActivityDataForPeriod(),
    getActivityCalendarData(),
    getDailyGoalValues(today.slice(0, 7)),
    getGoalStreaks(),
  ]);
  const activityCalendarDataKeys = Object.keys(activityCalendarData);
  return (
    <>
      <div className="grid gap-4 @3xl/main:col-span-2">
        <div className="@container grid grid-cols-1 auto-rows-max items-start gap-2 md:gap-2">
          <div className="grid gap-2 @lg:grid-cols-4">
            <JobsApplied />
            <JobsActivityCard
              data={[
                { label: "7d", summary: summary7Days },
                { label: "30d", summary: summary30Days },
              ]}
            />
          </div>
          <WeeklyBarChartToggle
            charts={[
              {
                label: "Jobs",
                data: weeklyData,
                keys: ["value"],
                axisLeftLegend: "JOBS APPLIED",
              },
              {
                label: "Activities",
                data: activitiesData.data,
                keys: activitiesData.keys,
                groupMode: "stacked",
                axisLeftLegend: "TIME SPENT (Hours)",
              },
            ]}
          />
        </div>
        <div className="w-full">
          <ActivityCalendar
            years={activityCalendarDataKeys}
            dataByYear={activityCalendarData}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <DailyGoalsCalendar
          today={today}
          initialData={dailyGoals.success ? dailyGoals.data : null}
          initialStreaks={goalStreaks.success ? goalStreaks.data : null}
        />
      </div>
      <div className="w-full col-span-3">
        <RecentCardToggle jobs={recentJobs} activities={recentActivities} />
      </div>
    </>
  );
}
