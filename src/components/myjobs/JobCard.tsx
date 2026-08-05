"use client";
import { Calendar, MapPin, PlusCircle, StickyNote } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { CircularScore } from "@/components/CircularScore";
import { JobResponse, JobStatus } from "@/models/job.model";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobActionsMenu } from "./JobActionsMenu";

type JobCardProps = {
  job: JobResponse;
  jobStatuses: JobStatus[];
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
};

export function JobCard({
  job,
  jobStatuses,
  editJob,
  onChangeJobStatus,
  onAddNote,
  onDeleteJob,
}: JobCardProps) {
  const notesCount = job._count?.Notes ?? 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Company logo"
          className="h-10 w-10 min-w-10 rounded-md object-cover"
          src={job.Company?.logoUrl || "/images/jobsync-logo.svg"}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/jobsync-logo.svg";
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/dashboard/myjobs/${job?.id}`}
              className="truncate font-semibold"
            >
              {job.JobTitle?.label}
            </Link>
            {notesCount > 0 && (
              <Badge
                variant="secondary"
                className="h-5 shrink-0 px-1.5 py-0 text-xs"
              >
                <StickyNote className="mr-0.5 h-3 w-3" />
                {notesCount}
              </Badge>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {job.Company?.label}
          </p>
        </div>
        {job.matchScore != null ? (
          <CircularScore score={job.matchScore} size="sm" animate={false} />
        ) : (
          <div
            title="No match score"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-muted text-xs text-muted-foreground"
          >
            &ndash;
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {job.Location?.label && (
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.Location.label}</span>
          </span>
        )}
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {job.appliedDate ? format(job.appliedDate, "PP") : "Not applied"}
        </span>
        {job.JobSource?.label && (
          <span className="flex min-w-0 items-center gap-1">
            <PlusCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.JobSource.label}</span>
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t pt-3">
        <JobStatusBadge job={job} />
        <JobActionsMenu
          job={job}
          jobStatuses={jobStatuses}
          editJob={editJob}
          onChangeJobStatus={onChangeJobStatus}
          onAddNote={onAddNote}
          onDeleteJob={onDeleteJob}
        />
      </div>
    </div>
  );
}
