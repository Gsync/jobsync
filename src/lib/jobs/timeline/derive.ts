import { APPLIED_STATUS_VALUES } from "@/lib/constants";

// The applied/appliedDate rules, shared so every status write path keeps the
// dashboard and CSV export in agreement. Only Applied stamps a date: an
// Interview or Offer logged later would otherwise count as applied today.
export function jobFieldsForStage(
  statusValue: string,
  statusId: string,
  occurredAt: Date | null,
  existingAppliedDate: Date | null,
): Record<string, unknown> {
  const data: Record<string, unknown> = { statusId };
  if (APPLIED_STATUS_VALUES.includes(statusValue) || existingAppliedDate) {
    data.applied = true;
  }
  if (statusValue === "applied" && !existingAppliedDate) {
    data.appliedDate = occurredAt ?? new Date();
  }
  return data;
}
