"use client";
import { useState } from "react";
import { JobResponse, JobStatus } from "@/models/job.model";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { JobCard } from "./JobCard";

type MyJobsGridProps = {
  jobs: JobResponse[];
  jobStatuses: JobStatus[];
  deleteJob: (id: string) => void;
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
};

function MyJobsGrid({
  jobs,
  jobStatuses,
  deleteJob,
  editJob,
  onChangeJobStatus,
  onAddNote,
}: MyJobsGridProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState("");

  const onDeleteJob = (jobId: string) => {
    setAlertOpen(true);
    setJobIdToDelete(jobId);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {jobs.map((job: JobResponse) => (
          <JobCard
            key={job.id}
            job={job}
            jobStatuses={jobStatuses}
            editJob={editJob}
            onChangeJobStatus={onChangeJobStatus}
            onAddNote={onAddNote}
            onDeleteJob={onDeleteJob}
          />
        ))}
      </div>
      <DeleteAlertDialog
        pageTitle="job"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteJob(jobIdToDelete)}
      />
    </>
  );
}

export default MyJobsGrid;
