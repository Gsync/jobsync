"use client";
import { Calendar, MapPin, PlusCircle, StickyNote } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { CircularScore } from "@/components/CircularScore";
import { JobResponse, JobStatus } from "@/models/job.model";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobActionsMenu } from "./JobActionsMenu";
import { MatchJobButton } from "./MatchJobButton";
import { CompanyLogo } from "./CompanyLogo";

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
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 font-sans transition-colors hover:bg-neutral-50/50">
      <div className="flex items-start gap-3">
        <CompanyLogo
          logoUrl={job.Company?.logoUrl}
          className="h-10 w-10 min-w-10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/dashboard/myjobs/${job?.id}`}
              className="truncate font-semibold text-neutral-900"
            >
              {job.JobTitle?.label}
            </Link>
            {notesCount > 0 && (
              <span className="inline-flex h-5 shrink-0 items-center rounded bg-neutral-100 px-1.5 py-0 text-xs text-neutral-600">
                <StickyNote className="mr-0.5 h-3 w-3" />
                {notesCount}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-neutral-500">
            {job.Company?.label}
          </p>
        </div>
        {job.matchScore != null ? (
          <CircularScore score={job.matchScore} size="sm" animate={false} />
        ) : (
          <MatchJobButton jobId={job.id} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
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

      <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3">
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
