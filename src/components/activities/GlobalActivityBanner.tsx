"use client";
import { useActivity } from "@/context/ActivityContext";
import { ActivityBanner } from "./ActivityBanner";
import { ActivityType } from "@/models/activity.model";

export function GlobalActivityBanner() {
  const { currentActivity, timeElapsed, stopActivity } = useActivity();

  if (!currentActivity) return null;

  const activityType = currentActivity.activityType as ActivityType;

  return (
    <div className="px-4 sm:px-6">
      <ActivityBanner
        title={currentActivity.activityName}
        typeLabel={activityType?.label || "Activity"}
        startTime={new Date(currentActivity.startTime)}
        onStopActivity={stopActivity}
        elapsedTime={timeElapsed}
      />
    </div>
  );
}
