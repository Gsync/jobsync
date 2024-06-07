import {
  getJobsActivityForPeriod,
  getJobsAppliedForPeriod,
  getRecentJobs,
} from "@/actions/dashboard.actions";
import MyResponsiveCalendar from "@/components/ActivityCalendar";
import JobsApplied from "@/components/JobsAppliedCard";
import NumberCard from "@/components/NumberCard";
import RecentJobsCard from "@/components/RecentJobsCard";
import WeeklyBarChart from "@/components/WeeklyBarChart";
import { calendarData } from "@/lib/data/calendarData";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Dashboard() {
  const [jobsAppliedLast7Days, jobsAppliedLast30Days, recentJobs, weeklyData] =
    await Promise.all([
      getJobsAppliedForPeriod(7),
      getJobsAppliedForPeriod(30),
      getRecentJobs(),
      getJobsActivityForPeriod(),
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
        <div className=" w-100 h-[240px] flex flex-col justify-center my-4">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            Weekly Activity
          </h3>
          <WeeklyBarChart data={weeklyData} />
        </div>
      </div>
      <div>
        <RecentJobsCard jobs={recentJobs} />
      </div>
      <div className="h-[200px] flex flex-col items-start col-span-3">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          Activity Calender
        </h3>
        <MyResponsiveCalendar data={calendarData.data} />
      </div>
    </>
  );
}
