"use client";
import { ListCollapse, MoreVertical, Pencil, StickyNote, Tags, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
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
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { JobResponse, JobStatus } from "@/models/job.model";

type JobActionsMenuProps = {
  job: JobResponse;
  jobStatuses: JobStatus[];
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
};

export function JobActionsMenu({
  job,
  jobStatuses,
  editJob,
  onChangeJobStatus,
  onAddNote,
  onDeleteJob,
}: JobActionsMenuProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-haspopup="true"
          size="icon"
          variant="ghost"
          data-testid="job-actions-menu-btn"
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push(`/dashboard/myjobs/${job?.id}`)}
          >
            <ListCollapse className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => editJob(job.id)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Job
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onAddNote(job.id)}
          >
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
                {jobStatuses.map((status) => (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    key={status.id}
                    onSelect={(_) => {
                      onChangeJobStatus(job.id, status);
                    }}
                    disabled={status.id === job.Status.id}
                  >
                    <span>{status.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
            onClick={() => onDeleteJob(job.id)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
