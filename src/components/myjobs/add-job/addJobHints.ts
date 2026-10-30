import { differenceInCalendarDays } from "date-fns";
import { JobStatus } from "@/models/job.model";

export const PRIMARY_STATUS_VALUES = [
  "new",
  "draft",
  "applied",
  "interview",
  "offer",
] as const;

export function splitStatuses(statuses: JobStatus[]): {
  primary: JobStatus[];
  more: JobStatus[];
} {
  const primaryValues: readonly string[] = PRIMARY_STATUS_VALUES;
  const primary = PRIMARY_STATUS_VALUES.flatMap(
    (v) => statuses.find((s) => s.value === v) ?? [],
  );
  const more = statuses.filter((s) => !primaryValues.includes(s.value));
  return { primary, more };
}

export function dueDateHint(due: Date | undefined, today: Date): string {
  if (!due) return "";
  const days = differenceInCalendarDays(due, today);
  if (days === 0) return "Due today";
  const n = Math.abs(days);
  const unit = n === 1 ? "day" : "days";
  return days > 0 ? `In ${n} ${unit}` : `${n} ${unit} ago`;
}

export type RequiredField = "title" | "company" | "location" | "source";

export const REQUIRED_FIELD_LABELS: Record<RequiredField, string> = {
  title: "Job Title",
  company: "Company",
  location: "Job Location",
  source: "Job Source",
};

const REQUIRED_FIELDS: RequiredField[] = [
  "title",
  "company",
  "location",
  "source",
];

export function missingRequiredFields(
  values: Partial<Record<RequiredField, string>>,
): RequiredField[] {
  return REQUIRED_FIELDS.filter((f) => !values[f]);
}
