import { JOB_STATUSES } from "@/lib/constants";
import { TaskStatus } from "@/models/task.model";
import { ProfileDocumentType } from "@/models/profile.model";
import { DiscoveryStatus } from "@/models/automation.model";

// Central badge color palette. Add new semantic colors here only.
export const BADGE_COLORS = {
  slate: "bg-slate-500 dark:bg-slate-400",
  blue: "bg-blue-500 dark:bg-blue-400",
  violet: "bg-violet-500 dark:bg-violet-400",
  amber: "bg-amber-500 dark:bg-amber-400",
  emerald: "bg-emerald-500 dark:bg-emerald-400",
  red: "bg-red-500 dark:bg-red-400",
} as const;

export type BadgeColor = keyof typeof BADGE_COLORS;

type JobStatusValue = (typeof JOB_STATUSES)[number]["value"];

export const JOB_STATUS_BADGE_COLORS: Record<JobStatusValue, BadgeColor> = {
  draft: "slate",
  applied: "blue",
  interview: "violet",
  offer: "emerald",
  rejected: "red",
  expired: "amber",
  archived: "slate",
};

// job.Status.value is a plain string from the DB, not the literal union,
// so lookups need a safe fallback for unrecognized values.
export function getJobStatusBadgeColor(value: string): BadgeColor {
  return (
    JOB_STATUS_BADGE_COLORS[value as JobStatusValue] ?? "slate"
  );
}

export const DISCOVERY_STATUS_BADGE_COLORS: Record<
  DiscoveryStatus,
  BadgeColor
> = {
  new: "blue",
  accepted: "emerald",
  dismissed: "slate",
};

export function getDiscoveryStatusBadgeColor(
  value: DiscoveryStatus,
): BadgeColor {
  return DISCOVERY_STATUS_BADGE_COLORS[value] ?? "slate";
}

export const TASK_STATUS_BADGE_COLORS: Record<TaskStatus, BadgeColor> = {
  "in-progress": "blue",
  complete: "emerald",
  "needs-attention": "amber",
  cancelled: "slate",
};

export const DOCUMENT_TYPE_BADGE_COLORS: Record<
  ProfileDocumentType,
  BadgeColor
> = {
  resume: "blue",
  "cover-letter": "violet",
};
