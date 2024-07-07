import {
  getActivityCalendarData,
  getJobsActivityForPeriod,
  getJobsAppliedForPeriod,
  getRecentJobs,
} from "@/actions/dashboard.actions";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  getMockJobActivityData,
  getMockRecentJobs,
  getRandomInt,
} from "@/lib/mock.utils";
import ActivityCalendar from "@/components/dashboard/ActivityCalendar";
import JobsApplied from "@/components/dashboard/JobsAppliedCard";
import NumberCard from "@/components/dashboard/NumberCard";
import RecentJobsCard from "@/components/dashboard/RecentJobsCard";
import WeeklyBarChart from "@/components/dashboard/WeeklyBarChart";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Dashboard() {
  const [
    jobsAppliedLast7Days,
    jobsAppliedLast30Days,
    recentJobs,
    weeklyData,
    activityCalendarData,
  ] = await Promise.all([
    // getJobsAppliedForPeriod(7),
    // getJobsAppliedForPeriod(30),
    // getRecentJobs(),
    // getJobsActivityForPeriod(),
    // getActivityCalendarData(),
    getRandomInt(5, 15),
    getRandomInt(20, 60),
    getMockRecentJobs(),
    getMockJobActivityData(7, 0.3, "MMM-dd"),
    getMockJobActivityData(180),
  ]);
  return (
    <>
      <div className="grid auto-rows-max items-start gap-2 md:gap-2 lg:col-span-2">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
          <JobsApplied />
          <NumberCard
            label="Last 7 days"
            num={jobsAppliedLast7Days}
            desc="+35%"
            progress={45}
          />
          <NumberCard
            label="Last 30 days"
            num={jobsAppliedLast30Days}
            desc="+20%"
            progress={25}
          />
        </div>
        <div className="flex flex-col justify-center">
          <WeeklyBarChart data={weeklyData} />
        </div>
      </div>
      <div>
        <RecentJobsCard jobs={recentJobs} />
      </div>
      <div className="flex flex-col items-start col-span-3">
        <ActivityCalendar data={activityCalendarData} />
      </div>
      <div className="flex flex-col items-start col-span-3">
        <Card className="p-2 w-[100%]">
          <CardContent>
            Souce Code:{" "}
            <a href="https://github.com/Gsync/jobsync" target="_blank">
              https://github.com/Gsync/jobsync
            </a>
          </CardContent>
          <CardFooter>
            Note: Data is randomly generated mock data, For a real experience
            please install app using the github link
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
