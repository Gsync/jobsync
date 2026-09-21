import { JOB_STATUSES } from "@/lib/constants";
import { TaskStatus } from "@/models/task.model";
import { ProfileDocumentType } from "@/models/profile.model";
import { DiscoveryStatus } from "@/models/automation.model";

// Central badge color palette. Add new semantic colors here only.
export const BADGE_COLORS = {
  slate:
    "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-400/15 dark:text-slate-300 dark:border-slate-400/25",
  teal: "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:bg-teal-400/15 dark:text-teal-300 dark:border-teal-400/25",
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-400/15 dark:text-blue-300 dark:border-blue-400/25",
  violet:
    "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-400/15 dark:text-violet-300 dark:border-violet-400/25",
  amber:
    "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-400/15 dark:text-amber-300 dark:border-amber-400/25",
  emerald:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:border-emerald-400/25",
  red: "bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-400/15 dark:text-red-300 dark:border-red-400/25",
} as const;

export type BadgeColor = keyof typeof BADGE_COLORS;

type JobStatusValue = (typeof JOB_STATUSES)[number]["value"];

export const JOB_STATUS_BADGE_COLORS: Record<JobStatusValue, BadgeColor> = {
  new: "teal",
  draft: "slate",
  applied: "blue",
  interview: "violet",
  offer: "emerald",
  "offer-accepted": "emerald",
  "offer-declined": "slate",
  rejected: "red",
  expired: "amber",
  archived: "slate",
  withdrawn: "slate",
};

// job.Status.value is a plain string from the DB, not the literal union,
// so lookups need a safe fallback for unrecognized values.
export function getJobStatusBadgeColor(value: string): BadgeColor {
  return JOB_STATUS_BADGE_COLORS[value as JobStatusValue] ?? "slate";
}

export const DISCOVERY_STATUS_BADGE_COLORS: Record<
  DiscoveryStatus,
  BadgeColor
> = {
  new: "teal",
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
