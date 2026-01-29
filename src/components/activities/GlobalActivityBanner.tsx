"use client";
import { useActivity } from "@/context/ActivityContext";
import { ActivityBanner } from "./ActivityBanner";
import { ActivityType } from "@/models/activity.model";

export function GlobalActivityBanner() {
  const { currentActivity, timeElapsed, stopActivity } = useActivity();

  if (!currentActivity) return null;

  const activityType = currentActivity.activityType as ActivityType;
  const message = `${activityType?.label || "Activity"} - ${currentActivity.activityName}`;

  return (
    <div className="px-4 sm:px-6">
      <ActivityBanner
        message={message}
        onStopActivity={stopActivity}
        elapsedTime={timeElapsed}
      />
    </div>
  );
}
