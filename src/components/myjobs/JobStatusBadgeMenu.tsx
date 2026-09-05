"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobStatusMenuItems } from "./JobStatusMenuItems";
import { JobResponse, JobStatus } from "@/models/job.model";

type JobStatusBadgeMenuProps = {
  job: JobResponse;
  jobStatuses: JobStatus[];
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  className?: string;
};

export function JobStatusBadgeMenu({
  job,
  jobStatuses,
  onChangeJobStatus,
  className,
}: JobStatusBadgeMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Change status, currently ${job.Status?.label ?? ""}`}
              className="cursor-pointer rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <JobStatusBadge job={job} className={className} />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Click to change status</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="p-0">
        <JobStatusMenuItems
          jobStatuses={jobStatuses}
          currentStatusId={job.Status?.id ?? ""}
          onSelectStatus={(status) => onChangeJobStatus(job.id, status)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
