"use client";
import { useState } from "react";
import { Archive, Loader2, Tags, Trash2, X } from "lucide-react";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { DeleteAlertDialog } from "../../DeleteAlertDialog";
import { JobStatus } from "@/models/job.model";
import { JobStatusMenuItems } from "../JobStatusMenuItems";

type JobSelectionBarProps = {
  selectedCount: number;
  jobStatuses: JobStatus[];
  pending: boolean;
  archiveAvailable: boolean;
  onClear: () => void;
  onChangeStatus: (status: JobStatus) => void;
  onArchive: () => void;
  onDelete: () => void;
};

// Bulk-action strip shown above the job list while rows/cards are selected.
export function JobSelectionBar({
  selectedCount,
  jobStatuses,
  pending,
  archiveAvailable,
  onClear,
  onChangeStatus,
  onArchive,
  onDelete,
}: JobSelectionBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div
        data-testid="job-selection-bar"
        className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2"
      >
        <span className="mr-1 text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "job" : "jobs"} selected
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={pending}
                aria-label="Change status of selected jobs"
              >
                <Tags className="h-3.5 w-3.5" />
                Change status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto p-0">
              <JobStatusMenuItems
                jobStatuses={jobStatuses}
                currentStatusId=""
                onSelectStatus={onChangeStatus}
              />
            </DropdownMenuContent>
          </DropdownMenu>
          {archiveAvailable && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={pending}
              onClick={onArchive}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            disabled={pending}
            aria-label="Clear selection"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>
      <DeleteAlertDialog
        pageTitle="jobs"
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onDelete={onDelete}
        alertTitle={`Delete ${selectedCount} selected ${
          selectedCount === 1 ? "job" : "jobs"
        }?`}
        alertDescription="This action cannot be undone. This will permanently delete the selected jobs and their data from the server."
      />
    </>
  );
}
