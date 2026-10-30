"use client";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JobStatus } from "@/models/job.model";
import { cn } from "@/lib/utils";
import { splitStatuses } from "./addJobHints";
import {
  SEGMENT_CHECKED_CLASS,
  SEGMENT_CLASS,
  SegmentedRadio,
} from "./SegmentedRadio";

type StatusSegmentProps = {
  statuses: JobStatus[];
  value?: string;
  onValueChange: (id: string) => void;
};

export function StatusSegment({
  statuses,
  value,
  onValueChange,
}: StatusSegmentProps) {
  const { primary, more } = splitStatuses(statuses);
  const moreSelected = more.find((s) => s.id === value);

  return (
    <SegmentedRadio
      aria-label="Status"
      options={primary.map((s) => ({ value: s.id, label: s.label }))}
      value={value}
      onValueChange={onValueChange}
    >
      {more.length > 0 && (
        <DropdownMenu>
          {/* Radix owns data-state on the trigger, so checked is a class */}
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                SEGMENT_CLASS,
                "inline-flex items-center justify-center gap-1",
                moreSelected && SEGMENT_CHECKED_CLASS,
              )}
            >
              {moreSelected?.label ?? "More"}
              {moreSelected && <span className="sr-only">, selected</span>}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {more.map((s) => (
              <DropdownMenuItem key={s.id} onSelect={() => onValueChange(s.id)}>
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SegmentedRadio>
  );
}
