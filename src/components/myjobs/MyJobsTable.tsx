"use client";
import { StickyNote } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { JobResponse, JobStatus } from "@/models/job.model";
import Link from "next/link";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { CircularScore } from "@/components/CircularScore";
import { JobStatusBadgeMenu } from "./JobStatusBadgeMenu";
import { JobActionsMenu } from "./JobActionsMenu";
import { MatchJobButton } from "./MatchJobButton";
import { CompanyLogo } from "./CompanyLogo";
import { cn } from "@/lib/utils";

type MyJobsTableProps = {
  jobs: JobResponse[];
  jobStatuses: JobStatus[];
  deleteJob: (id: string) => void;
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
};

// osui tasks-table structure (paper/ink, neutral) with live application rows.
function MyJobsTable({
  jobs,
  jobStatuses,
  deleteJob,
  editJob,
  onChangeJobStatus,
  onAddNote,
}: MyJobsTableProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState("");

  const onDeleteJob = (jobId: string) => {
    setAlertOpen(true);
    setJobIdToDelete(jobId);
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white font-sans">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Applications</p>
          <p className="text-xs text-neutral-500">{`${jobs.length} tracked`}</p>
        </div>
      </div>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs text-neutral-500">
            <th className="hidden w-14 px-4 py-2.5 sm:table-cell" />
            <th className="px-2 py-2.5 font-medium">Role</th>
            <th className="px-3 py-2.5 font-medium">Organization</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">Applied</th>
            <th className="px-3 py-2.5 font-medium">Stage</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">Due</th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job: JobResponse) => (
            <tr
              key={job.id}
              className="border-t border-neutral-100 transition-colors hover:bg-neutral-50/80"
            >
              <td className="hidden px-4 py-3 sm:table-cell">
                <CompanyLogo logoUrl={job.Company?.logoUrl} className="h-8 w-8 min-w-8" />
              </td>
              <td className="max-w-30 px-2 py-3 md:max-w-55">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/dashboard/myjobs/${job?.id}`}
                    className="block truncate font-medium text-neutral-900 hover:underline"
                  >
                    {job.JobTitle?.label}
                  </Link>
                  {(job._count?.Notes ?? 0) > 0 && (
                    <span className="inline-flex h-5 shrink-0 items-center rounded bg-neutral-100 px-1.5 text-xs text-neutral-600">
                      <StickyNote className="mr-0.5 h-3 w-3" />
                      {job._count!.Notes}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-neutral-500 md:hidden">
                  {job.Company?.label}
                </p>
              </td>
              <td className="max-w-25 px-3 py-3 md:max-w-40">
                <span className="block truncate text-neutral-600">{job.Company?.label}</span>
              </td>
              <td className="hidden whitespace-nowrap px-3 py-3 text-neutral-500 md:table-cell">
                {job.appliedDate ? format(job.appliedDate, "PP") : "—"}
              </td>
              <td className="px-3 py-3">
                <JobStatusBadgeMenu
                  job={job}
                  jobStatuses={jobStatuses}
                  onChangeJobStatus={onChangeJobStatus}
                  className="w-[110px] justify-center whitespace-nowrap"
                />
              </td>
              <td className="hidden whitespace-nowrap px-3 py-3 text-neutral-500 md:table-cell">
                <span className={cn(job.dueDate && new Date(job.dueDate) < new Date() && !job.applied && "font-medium text-red-600")}>
                  {job.dueDate ? format(job.dueDate, "PP") : "—"}
                </span>
                {job.matchScore != null ? (
                  <span className="ml-2 inline-block align-middle">
                    <CircularScore score={job.matchScore} size="sm" animate={false} className="mx-auto" />
                  </span>
                ) : (
                  <span className="ml-2 inline-block align-middle">
                    <MatchJobButton jobId={job.id} />
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <JobActionsMenu
                  job={job}
                  jobStatuses={jobStatuses}
                  editJob={editJob}
                  onChangeJobStatus={onChangeJobStatus}
                  onAddNote={onAddNote}
                  onDeleteJob={onDeleteJob}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <DeleteAlertDialog
        pageTitle="job"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteJob(jobIdToDelete)}
      />
    </div>
  );
}

export default MyJobsTable;
