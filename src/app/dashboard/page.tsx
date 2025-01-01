import {
  getActivityCalendarData,
  getActivityDataForPeriod,
  getJobsActivityForPeriod,
  getJobsAppliedForPeriod,
  getRecentJobs,
} from "@/actions/dashboard.actions";
import ActivityCalendar from "@/components/dashboard/ActivityCalendar";
import JobsApplied from "@/components/dashboard/JobsAppliedCard";
import NumberCard from "@/components/dashboard/NumberCard";
import RecentJobsCard from "@/components/dashboard/RecentJobsCard";
import WeeklyBarChart from "@/components/dashboard/WeeklyBarChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Dashboard() {
  const [
    { count: jobsAppliedLast7Days, trend: trendFor7Days },
    { count: jobsAppliedLast30Days, trend: trendFor30Days },
    recentJobs,
    weeklyData,
    activitiesData,
    activityCalendarData,
  ] = await Promise.all([
    getJobsAppliedForPeriod(7),
    getJobsAppliedForPeriod(30),
    getRecentJobs(),
    getJobsActivityForPeriod(),
    getActivityDataForPeriod(),
    getActivityCalendarData(),
  ]);
  const activitiesDataKeys = (data: string[]) =>
    Array.from(
      new Set(
        data.flatMap((entry) =>
          Object.keys(entry).filter((key) => key !== "day")
        )
      )
    );
  return (
    <>
      <div className="grid auto-rows-max items-start gap-2 md:gap-2 lg:col-span-2">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
          <JobsApplied />
          <NumberCard
            label="Last 7 days"
            num={jobsAppliedLast7Days}
            trend={trendFor7Days}
          />
          <NumberCard
            label="Last 30 days"
            num={jobsAppliedLast30Days}
            trend={trendFor30Days}
          />
        </div>
        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">Weekly Jobs</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>
          <TabsContent value="jobs">
            <WeeklyBarChart
              data={weeklyData}
              keys={["value"]}
              axisLeftLegend="NUMBER OF JOBS APPLIED"
            />
          </TabsContent>
          <TabsContent value="activities">
            <WeeklyBarChart
              data={activitiesData}
              keys={activitiesDataKeys(activitiesData)}
              groupMode="stacked"
              axisLeftLegend="TIME SPENT (Hours)"
            />
          </TabsContent>
        </Tabs>
      </div>
      <div>
        <RecentJobsCard jobs={recentJobs} />
      </div>
      <div className="flex flex-col items-start col-span-3">
        <ActivityCalendar data={activityCalendarData} />
      </div>
    </>
  );
}
