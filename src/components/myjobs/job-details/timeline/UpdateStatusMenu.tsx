"use client";
import { HelpCircle, Plus, Tags, Users } from "lucide-react";
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
import type { JobStatus } from "@/models/job.model";
import type { JobStage } from "@/models/jobStage.model";
import { isInterviewStage } from "./stageDisplay";

type UpdateStatusMenuProps = {
  targetStage: JobStage | null;
  jobStatuses: JobStatus[];
  currentStatusId: string;
  onChangeStatus: (status: JobStatus) => void;
  onAddStage: () => void;
  onLinkInterviewers: () => void;
  onAddPrepQuestions: () => void;
};

export function UpdateStatusMenu({
  targetStage,
  jobStatuses,
  currentStatusId,
  onChangeStatus,
  onAddStage,
  onLinkInterviewers,
  onAddPrepQuestions,
}: UpdateStatusMenuProps) {
  // Disabled with a visible reason rather than hidden: an item that comes and
  // goes as you change tabs is harder to learn than one that greys out.
  const reason = !targetStage
    ? "Add a stage first"
    : isInterviewStage(targetStage)
      ? null
      : `${targetStage.StageType.label} is not an interview stage`;

  const items: {
    key: string;
    label: string;
    icon: typeof Plus;
    onSelect: () => void;
    reason: string | null;
  }[] = [
    { key: "add", label: "Add Stage", icon: Plus, onSelect: onAddStage, reason: null },
    { key: "link", label: "Link Interviewers", icon: Users, onSelect: onLinkInterviewers, reason },
    { key: "prep", label: "Add to Prep List", icon: HelpCircle, onSelect: onAddPrepQuestions, reason },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="cursor-pointer"
          data-testid="update-status-menu-btn"
        >
          <Tags className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Update Status
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
        <DropdownMenuGroup>
          {/* Moved out of the ⋮ menu: one control answers "where is this job
              now", instead of two with near-identical names. */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Tags className="mr-2 h-4 w-4" />
              Change status
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="p-0">
                <JobStatusMenuItems
                  jobStatuses={jobStatuses}
                  currentStatusId={currentStatusId}
                  onSelectStatus={onChangeStatus}
                />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />

          {items.map(({ key, label, icon: Icon, onSelect, reason: itemReason }) => (
            <DropdownMenuItem
              key={key}
              className="cursor-pointer"
              disabled={!!itemReason}
              onSelect={onSelect}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>
                {label}
                {itemReason && (
                  <span className="block text-xs text-muted-foreground">
                    {itemReason}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
