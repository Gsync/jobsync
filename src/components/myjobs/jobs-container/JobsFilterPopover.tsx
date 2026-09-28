"use client";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Toggle } from "../../ui/toggle";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { JOB_STATUSES } from "@/lib/constants";
import {
  EMPTY_JOB_FACETS,
  countJobFacets,
  normalizeJobFacets,
} from "@/lib/jobs/jobFacets";
import {
  JOB_TYPES,
  JobFacets,
  JobListScope,
  JobStatus,
  WORKPLACE_TYPES,
} from "@/models/job.model";
import { useJobFilterCounts } from "./useJobFilterCounts";

const STATUS_ORDER: string[] = JOB_STATUSES.map((s) => s.value);
const ACCEPTED_LABEL = "Accepted (discovered)";
const SECTION_LABEL =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

const toggleIn = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

// Draft-until-apply filter popover for the Jobs list (see D1 in the plan).
export function JobsFilterPopover({
  statuses,
  facets,
  search,
  scope,
  onApply,
}: {
  statuses: JobStatus[];
  facets: JobFacets;
  search: string;
  scope: JobListScope;
  onApply: (facets: JobFacets) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<JobFacets>(facets);
  const normalized = normalizeJobFacets(draft);
  const counts = useJobFilterCounts({
    enabled: open,
    facets: normalized,
    search,
    scope,
  });
  const active = countJobFacets(facets);

  const orderedStatuses = [...statuses].sort(
    (a, b) => STATUS_ORDER.indexOf(a.value) - STATUS_ORDER.indexOf(b.value),
  );
  const allStatusesPicked =
    orderedStatuses.every((s) => draft.statuses.includes(s.value)) &&
    draft.acceptedDiscovered;

  const onOpenChange = (next: boolean) => {
    // Re-seed on every open so a closed-without-apply draft is discarded.
    if (next) setDraft(facets);
    setOpen(next);
  };

  const apply = () => {
    onApply(normalized);
    setOpen(false);
  };

  const toggleAllStatuses = () =>
    setDraft((d) =>
      allStatusesPicked
        ? { ...d, statuses: [], acceptedDiscovered: false }
        : {
            ...d,
            statuses: orderedStatuses.map((s) => s.value),
            acceptedDiscovered: true,
          },
    );

  const total = counts?.total;
  const applyLabel =
    total === undefined
      ? "Show jobs"
      : `Show ${total} ${total === 1 ? "job" : "jobs"}`;

  const segmented = (
    options: Record<string, string>,
    picked: string[],
    onToggle: (code: string) => void,
  ) => (
    <div className="flex gap-1.5">
      {Object.entries(options).map(([code, label]) => (
        <Toggle
          key={code}
          variant="outline"
          size="sm"
          pressed={picked.includes(code)}
          onPressedChange={() => onToggle(code)}
          className="h-8 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {label}
        </Toggle>
      ))}
    </div>
  );

  const statusRow = (
    key: string,
    label: string,
    checked: boolean,
    count: number | undefined,
    onChange: () => void,
  ) => (
    <label key={key} className="flex min-h-6 cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0"
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs text-muted-foreground">
        {counts ? (count ?? 0) : "–"}
      </span>
    </label>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          data-testid="job-filter-button"
          aria-label={active ? `Filter jobs, ${active} active` : "Filter jobs"}
          className={cn(
            "relative h-8 w-8 p-0",
            active > 0 && "border-foreground ring-2 ring-foreground/10",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {active > 0 && (
            <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-foreground px-1 text-[11px] font-semibold text-background">
              {active}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        aria-label="Filter jobs"
        className="flex w-[min(380px,calc(100vw-32px))] flex-col p-0"
      >
        <div className="max-h-[min(70vh,560px)] overflow-y-auto">
          <div className="flex flex-col gap-2.5 border-b p-4 pb-3">
            <div className="flex items-center justify-between">
              <span className={SECTION_LABEL}>Status</span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={toggleAllStatuses}
              >
                {allStatusesPicked ? "Clear" : "Select all"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
              {orderedStatuses.map((s) =>
                statusRow(
                  s.id,
                  s.label,
                  draft.statuses.includes(s.value),
                  counts?.statusCounts[s.id],
                  () =>
                    setDraft((d) => ({
                      ...d,
                      statuses: toggleIn(d.statuses, s.value),
                    })),
                ),
              )}
              {statusRow(
                "accepted",
                ACCEPTED_LABEL,
                draft.acceptedDiscovered,
                counts?.acceptedDiscovered,
                () =>
                  setDraft((d) => ({
                    ...d,
                    acceptedDiscovered: !d.acceptedDiscovered,
                  })),
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2.5 border-b px-4 py-3">
            <span className={SECTION_LABEL}>Job type</span>
            {segmented(JOB_TYPES, draft.jobTypes, (code) =>
              setDraft((d) => ({ ...d, jobTypes: toggleIn(d.jobTypes, code) })),
            )}
          </div>
          <div className="flex flex-col gap-2.5 border-b px-4 py-3">
            <span className={SECTION_LABEL}>Workplace</span>
            {segmented(WORKPLACE_TYPES, draft.workplaces, (code) =>
              setDraft((d) => ({
                ...d,
                workplaces: toggleIn(d.workplaces, code),
              })),
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 border-b px-4 py-3 text-[13px]">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0"
              aria-label="Include dismissed discovered jobs"
              checked={draft.includeDismissed}
              onChange={() =>
                setDraft((d) => ({ ...d, includeDismissed: !d.includeDismissed }))
              }
            />
            <span>Include dismissed discovered jobs</span>
          </label>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setDraft(EMPTY_JOB_FACETS)}
          >
            Clear all
          </Button>
          <Button size="sm" onClick={apply}>
            {applyLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
