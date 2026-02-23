"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { JobResponse } from "@/models/job.model";
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

const tabs = ["Jobs", "Activities"] as const;

export default function RecentCardToggle({
  jobs,
  activities,
}: RecentCardToggleProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <Card className="mb-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-green-600">
            Recent {tabs[activeIndex]}
          </CardTitle>
          <div className="flex rounded-md border text-xs">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveIndex(index)}
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
      <CardContent className="grid gap-6">
        {activeIndex === 0
          ? jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-4">
                <Avatar className="hidden h-8 w-8 sm:flex">
                  <AvatarImage
                    src={job.Company?.logoUrl || "/images/jobsync-logo.svg"}
                    alt="Avatar"
                  />
                  <AvatarFallback>JS</AvatarFallback>
                </Avatar>
                <Link href={`/dashboard/myjobs/${job?.id}`}>
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                      {job.JobTitle?.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {job.Company?.label}
                    </p>
                  </div>
                </Link>
                <div className="ml-auto text-sm font-medium">
                  {job?.appliedDate ? format(job.appliedDate, "PP") : "N/A"}
                </div>
              </div>
            ))
          : activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4">
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
                  <p className="text-xs text-muted-foreground">
                    {activity.endTime ? format(activity.endTime, "PP") : ""}
                  </p>
                </div>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}
