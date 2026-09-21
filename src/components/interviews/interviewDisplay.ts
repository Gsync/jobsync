import { format } from "date-fns";
import { STAGE_OUTCOMES } from "@/lib/constants";

// A round created through Add Stage has no outcome — the field only appears
// when editing — so a null one is derived from the date rather than left as a
// dash. Nothing here is ever written back.
export function outcomeLabel(
  occurredAt: Date | null,
  outcome: string | null,
  now: Date = new Date(),
): string {
  const stored = STAGE_OUTCOMES.find((o) => o.value === outcome);
  if (stored) return stored.label;
  if (!occurredAt) return "Not scheduled";
  return occurredAt.getTime() >= now.getTime() ? "Scheduled" : "Awaiting outcome";
}

export type OutcomeTone = "default" | "secondary" | "destructive" | "outline";

export function outcomeTone(label: string): OutcomeTone {
  if (label === "Passed") return "default";
  if (label === "Failed" || label === "No-show" || label === "Cancelled") {
    return "destructive";
  }
  if (label === "Scheduled") return "outline";
  return "secondary";
}

export type FormatIcon = "video" | "phone" | "location";

// JobStage.format is free text, so the icon is a guess that degrades to a
// neutral pin rather than to a wrong icon.
export function formatIconKind(value: string | null): FormatIcon {
  if (!value) return "location";
  if (/video|zoom|meet|teams|hangout|webex/i.test(value)) return "video";
  if (/phone|call|voice/i.test(value)) return "phone";
  return "location";
}

export function formatText(
  value: string | null,
  location: string | null,
): string {
  return location?.trim() || value?.trim() || "Not set";
}

export function durationLabel(mins: number | null): string | null {
  if (!mins) return null;
  return mins >= 60 && mins % 60 === 0 ? `${mins / 60}h` : `${mins}m`;
}

export function whenParts(occurredAt: Date | null): {
  day: string;
  time: string | null;
} {
  if (!occurredAt) return { day: "No date", time: null };
  return {
    day: format(occurredAt, "EEE d MMM"),
    time: format(occurredAt, "h:mm a"),
  };
}

function abbreviate(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  return `${parts[0]![0]!.toUpperCase()}. ${parts[parts.length - 1]}`;
}

export function interviewerSummary(
  interviewers: { Contact: { name: string } }[],
): string {
  if (interviewers.length === 0) return "None linked";
  if (interviewers.length > 2) return `${interviewers.length} interviewers`;
  return interviewers.map((i) => abbreviate(i.Contact.name)).join(", ");
}

export function prepSummary(prep: { asked: boolean }[]): string {
  const asked = prep.filter((p) => p.asked).length;
  return asked > 0 ? `${asked} / ${prep.length}` : String(prep.length);
}
