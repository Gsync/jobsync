"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { getJobStatusBadgeColor } from "@/lib/badge-colors";
import { cn } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { usePersistedTabIndex } from "@/hooks/usePersistedTabIndex";
import { useActivity } from "@/context/ActivityContext";
import { useActivitySwitchConfirm } from "@/hooks/useActivitySwitchConfirm";
import { JobResponse } from "@/models/job.model";
import { CirclePlay } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

type RecentActivity = {
  id: string;
  activityName: string;
  duration: number | null;
  endTime: Date | null;
  activityType: { label: string } | null;
};

interface RecentCardToggleProps {
  jobs: JobResponse[];
  activities: RecentActivity[];
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return totalMinutes === 0 ? "0min" : `${hours}h ${minutes}min`;
}

function groupJobsByDate(jobs: JobResponse[]) {
  const groups = new Map<string, JobResponse[]>();
  for (const job of jobs) {
    const key = job.appliedDate
      ? format(job.appliedDate, "EEE MMMM d, yyyy")
      : "No date";
    const existing = groups.get(key);
    if (existing) {
      existing.push(job);
    } else {
      groups.set(key, [job]);
    }
  }
  return Array.from(groups.entries());
}

function groupActivitiesByDate(activities: RecentActivity[]) {
  const groups = new Map<string, RecentActivity[]>();
  for (const activity of activities) {
    const key = activity.endTime
      ? format(activity.endTime, "EEE MMMM d, yyyy")
      : "In progress";
    const existing = groups.get(key);
    if (existing) {
      existing.push(activity);
    } else {
      groups.set(key, [activity]);
    }
  }
  return Array.from(groups.entries());
}

const tabs = ["Jobs", "Activities"] as const;

export default function RecentCardToggle({
  jobs,
  activities,
}: RecentCardToggleProps) {
  const [activeIndex, selectTab] = usePersistedTabIndex(
    APP_CONSTANTS.DASHBOARD_RECENT_CARD_STORAGE_KEY,
    tabs,
  );
  const { startActivity } = useActivity();
  const { requestStart, confirmDialog } = useActivitySwitchConfirm();

  return (
    <Card className="mb-2 lg:absolute lg:inset-0 lg:mb-0 lg:flex lg:flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-green-600 min-w-0 truncate">
            Recent {tabs[activeIndex]}
          </CardTitle>
          <div
            className="flex shrink-0 rounded-md border text-xs"
            data-testid="recent-card-toggle-group"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => selectTab(index)}
                className={cn(
                  "px-2 py-1 transition-colors",
                  index === 0 && "rounded-l-md",
                  index === tabs.length - 1 && "rounded-r-md",
                  activeIndex === index
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid auto-rows-max gap-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {activeIndex === 0
          ? groupJobsByDate(jobs).map(([date, dateJobs]) => (
              <div key={date} className="grid gap-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {date}
                </p>
                {dateJobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-4">
                    <Avatar className="hidden h-8 w-8 sm:flex">
                      <AvatarImage
                        src={job.Company?.logoUrl || "/images/jobsync-logo.svg"}
                        alt="Avatar"
                      />
                      <AvatarFallback>JS</AvatarFallback>
                    </Avatar>
                    <Link href={`/dashboard/myjobs/${job?.id}`} className="min-w-0">
                      <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none truncate">
                          {job.JobTitle?.label}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {job.Company?.label}
                          {job.Location?.label ? ` · ${job.Location.label}` : ""}
                        </p>
                      </div>
                    </Link>
                    {job.Status?.label ? (
                      <StatusBadge
                        label={job.Status.label}
                        color={getJobStatusBadgeColor(job.Status.value)}
                        className="ml-auto shrink-0 justify-center text-xs px-1.5 py-0 h-5"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ))
          : groupActivitiesByDate(activities).map(([date, dateActivities]) => (
              <div key={date} className="grid gap-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {date}
                </p>
                <div className="grid gap-4">
                  {dateActivities.map((activity) => (
                    <div
                      key={activity.id}
                      data-testid="recent-activity-row"
                      className="group relative flex items-center gap-1"
                    >
                      <Button
                        title="Start Activity"
                        data-testid="recent-activity-start-btn"
                        size="icon"
                        variant="ghost"
                        onClick={() => requestStart(() => startActivity(activity.id))}
                        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300"
                      >
                        <span>
                          <CirclePlay className="text-green-600 h-3.5 w-3.5" />
                        </span>
                      </Button>
                      <div className="grid gap-1 min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none truncate">
                          {activity.activityName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.activityType?.label || "Unknown"}
                        </p>
                      </div>
                      <div className="ml-auto text-right shrink-0">
                        <p className="text-sm font-medium">
                          {formatDuration(activity.duration ?? 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
