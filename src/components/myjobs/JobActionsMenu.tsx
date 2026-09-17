"use client";
import { ListCollapse, Pencil, StickyNote, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  KebabActionsDropdown,
  type KebabMenuItem,
} from "../osui/dropdowns/kebab-actions-dropdown";
import { JobResponse, JobStatus } from "@/models/job.model";

type JobActionsMenuProps = {
  job: JobResponse;
  jobStatuses: JobStatus[];
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
};

// osui kebab-actions-dropdown (status changes live in the table's Status pill).
const ITEMS: readonly KebabMenuItem[] = [
  { id: "details", label: "View details", icon: ListCollapse },
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "note", label: "Add a note", icon: StickyNote },
  { id: "separator-delete", separator: true },
  { id: "delete", label: "Delete", icon: Trash, danger: true },
];

export function JobActionsMenu({ job, editJob, onAddNote, onDeleteJob }: JobActionsMenuProps) {
  const router = useRouter();
  return (
    <KebabActionsDropdown
      rowTitle={job.JobTitle?.label ?? "Application"}
      triggerAriaLabel="Application actions"
      items={ITEMS}
      onItemClick={(item) => {
        if (item.id === "details") router.push(`/dashboard/myjobs/${job?.id}`);
        else if (item.id === "edit") editJob(job.id);
        else if (item.id === "note") onAddNote(job.id);
        else if (item.id === "delete") onDeleteJob(job.id);
      }}
    />
  );
}
