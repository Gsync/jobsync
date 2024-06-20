import {
  getActivityCalendarData,
  getJobsActivityForPeriod,
  getJobsAppliedForPeriod,
  getRecentJobs,
} from "@/actions/dashboard.actions";
import ActivityCalendar from "@/components/ActivityCalendar";
import JobsApplied from "@/components/JobsAppliedCard";
import NumberCard from "@/components/NumberCard";
import RecentJobsCard from "@/components/RecentJobsCard";
import WeeklyBarChart from "@/components/WeeklyBarChart";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  getMockJobActivityData,
  getMockRecentJobs,
  getRandomInt,
} from "@/lib/mock.utils";

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
    getMockJobActivityData(7, 0.3, "PP"),
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
          {/* <WeeklyBarChart
            data={generateRandomActivityCalendarData(7, 0.3, "PP")}
          /> */}
        </div>
      </div>
      <div>
        <RecentJobsCard jobs={recentJobs} />
      </div>
      <div className="flex flex-col items-start col-span-3">
        <ActivityCalendar data={activityCalendarData} />
        {/* <ActivityCalendar data={generateRandomActivityCalendarData(150)} /> */}
      </div>
      <div className="flex flex-col items-start col-span-3">
        <Card>
          <CardContent>
            Souce Code:{" "}
            <a href="https://github.com/Gsync/jobsync" target="_blank">
              https://github.com/Gsync/jobsync
            </a>
          </CardContent>
          <CardFooter>Note: Data is randomly generated mock data</CardFooter>
        </Card>
      </div>
    </>
  );
}
