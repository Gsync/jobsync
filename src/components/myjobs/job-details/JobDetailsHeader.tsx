"use client";

import {
  ArrowLeft,
  FileText,
  MoreVertical,
  Pencil,
  Sparkles,
  StickyNote,
  Tags,
  Trash,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JobStatusMenuItems } from "@/components/myjobs/JobStatusMenuItems";
import {
  JobResponse,
  JobStatus,
  getJobTypeLabel,
  getWorkplaceTypeLabel,
} from "@/models/job.model";
import { CompanyLogo } from "../CompanyLogo";

type JobDetailsHeaderProps = {
  job: JobResponse;
  jobStatuses: JobStatus[];
  currentStatus: JobStatus;
  coverLetterBlockedReason?: string;
  chatBusy: boolean;
  onBack: () => void;
  onMatch: () => void;
  onCoverLetter: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddNote: () => void;
  onChangeStatus: (status: JobStatus) => void;
};

export function JobDetailsHeader({
  job,
  jobStatuses,
  currentStatus,
  coverLetterBlockedReason,
  chatBusy,
  onBack,
  onMatch,
  onCoverLetter,
  onEdit,
  onDelete,
  onAddNote,
  onChangeStatus,
}: JobDetailsHeaderProps) {
  const subtitle = [
    job.Company?.label,
    job.Location?.label,
    getJobTypeLabel(job.jobType),
    job.workplaceType ? getWorkplaceTypeLabel(job.workplaceType) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4 @5xl/main:flex-row @5xl/main:items-center">
      <div className="flex flex-1 min-w-0 items-center gap-4">
        <Button title="Go Back" variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <CompanyLogo
          logoUrl={job.Company?.logoUrl}
          className="h-10 w-10 min-w-10"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{job.JobTitle?.label}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          className="cursor-pointer"
          disabled={chatBusy}
          title={chatBusy ? "The assistant is busy" : undefined}
          onClick={onMatch}
        >
          <Sparkles className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Match with AI
          </span>
        </Button>
        <Button
          variant="outline"
          className="cursor-pointer"
          data-testid="generate-cover-letter-btn"
          disabled={!!coverLetterBlockedReason}
          title={coverLetterBlockedReason}
          onClick={onCoverLetter}
        >
          <FileText className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            {job.coverLetterId ? "Regenerate Letter" : "Cover Letter"}
          </span>
        </Button>
        <Button
          variant="outline"
          onClick={onEdit}
          data-testid="job-details-edit-btn"
        >
          <Pencil className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Edit
          </span>
        </Button>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          data-testid="job-details-delete-btn"
        >
          <Trash2 className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Delete
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-haspopup="true"
              size="icon"
              variant="ghost"
              data-testid="job-details-actions-menu-btn"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Job
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={onAddNote}>
                <StickyNote className="mr-2 h-4 w-4" />
                Add a Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tags className="mr-2 h-4 w-4" />
                  Change status
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="p-0">
                    <JobStatusMenuItems
                      jobStatuses={jobStatuses}
                      currentStatusId={currentStatus.id}
                      onSelectStatus={onChangeStatus}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={onDelete}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
