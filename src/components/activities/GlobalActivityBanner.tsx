"use client";
import { useActivity } from "@/context/ActivityContext";
import { ActivityBanner } from "./ActivityBanner";
import { ActivityType } from "@/models/activity.model";
import { useTranslations } from "@/i18n/use-translations";

export function GlobalActivityBanner() {
  const { t } = useTranslations();
  const { currentActivity, timeElapsed, stopActivity } = useActivity();

  if (!currentActivity) return null;

  const activityType = currentActivity.activityType as ActivityType;
  const message = `${activityType?.label || t("activities.activity")} - ${currentActivity.activityName}`;

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
