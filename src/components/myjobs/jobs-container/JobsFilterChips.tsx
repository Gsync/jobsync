"use client";
import { X } from "lucide-react";
import { EMPTY_JOB_FACETS, hasJobFacets } from "@/lib/jobs/jobFacets";
import {
  JobFacets,
  JobStatus,
  getJobTypeLabel,
  getWorkplaceTypeLabel,
} from "@/models/job.model";

// "Filtered by" row for the popover facets; deep-link chips stay in the
// header (D6), so Clear all here leaves company/title/location/source alone.
export function JobsFilterChips({
  statuses,
  facets,
  onChange,
}: {
  statuses: JobStatus[];
  facets: JobFacets;
  onChange: (facets: JobFacets) => void;
}) {
  if (!hasJobFacets(facets)) return null;

  const statusLabels = [
    ...facets.statuses.map(
      (value) => statuses.find((s) => s.value === value)?.label ?? value,
    ),
    ...(facets.acceptedDiscovered ? ["Accepted (discovered)"] : []),
  ];

  const chips = [
    {
      name: "Status",
      value: statusLabels.join(", "),
      clear: { statuses: [], acceptedDiscovered: false },
    },
    {
      name: "Job type",
      value: facets.jobTypes.map((c) => getJobTypeLabel(c)).join(", "),
      clear: { jobTypes: [] },
    },
    {
      name: "Workplace",
      value: facets.workplaces.map((c) => getWorkplaceTypeLabel(c)).join(", "),
      clear: { workplaces: [] },
    },
    {
      name: "Dismissed",
      value: facets.includeDismissed ? "Included" : "",
      clear: { includeDismissed: false },
    },
  ].filter((chip) => chip.value);

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <span className="mr-0.5 text-xs text-muted-foreground">Filtered by</span>
      {chips.map((chip) => (
        <button
          key={chip.name}
          type="button"
          aria-label={`Remove ${chip.name} filter`}
          title={chip.value}
          onClick={() => onChange({ ...facets, ...chip.clear })}
          className="inline-flex h-7 max-w-[280px] items-center gap-1.5 rounded-md bg-muted pl-2.5 pr-2 text-[13px] hover:bg-muted/70"
        >
          <span className="text-muted-foreground">{chip.name}</span>
          <span className="truncate font-medium">{chip.value}</span>
          <X className="h-3 w-3 shrink-0" />
        </button>
      ))}
      <button
        type="button"
        className="h-7 px-2 text-[13px] text-muted-foreground underline hover:text-foreground"
        onClick={() => onChange(EMPTY_JOB_FACETS)}
      >
        Clear all
      </button>
    </div>
  );
}
