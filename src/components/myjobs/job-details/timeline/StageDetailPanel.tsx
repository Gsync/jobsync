"use client";
import { useState, useTransition } from "react";
import { CalendarDays, Monitor, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteAlertDialog } from "@/components/DeleteAlertDialog";
import { toastActionResult } from "@/lib/toast";
import {
  deleteJobStage,
  unlinkStageInterviewer,
} from "@/actions/jobStage.actions";
import { STAGE_OUTCOMES } from "@/lib/constants";
import type { JobStage } from "@/models/jobStage.model";
import {
  formatStageDateTime,
  isInterviewStage,
  stageInitials,
} from "./stageDisplay";
import { StagePrepList } from "./StagePrepList";
import { StageNotes } from "./StageNotes";

type StageDetailPanelProps = {
  stage: JobStage;
  isCurrent: boolean;
  onEdit: () => void;
  onLinkInterviewers: () => void;
  onAddPrepQuestions: () => void;
  onChanged: () => void;
};

export function StageDetailPanel({
  stage,
  isCurrent,
  onEdit,
  onLinkInterviewers,
  onAddPrepQuestions,
  onChanged,
}: StageDetailPanelProps) {
  const [, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const interview = isInterviewStage(stage);
  const outcomeLabel = STAGE_OUTCOMES.find((o) => o.value === stage.outcome)?.label;

  const unlink = (linkId: string) => {
    startTransition(async () => {
      const res = await unlinkStageInterviewer(linkId);
      toastActionResult(res, {
        success: "Interviewer unlinked from this stage",
        onSuccess: onChanged,
      });
    });
  };

  const onDelete = () => {
    setDeleteOpen(false);
    startTransition(async () => {
      const res = await deleteJobStage(stage.id);
      toastActionResult(res, {
        success: "Stage has been deleted",
        onSuccess: onChanged,
      });
    });
  };

  return (
    <div className="flex-1 rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-lg font-bold">{stage.StageType.label}</h3>
          {isCurrent && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
              CURRENT STAGE
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            aria-label={`Edit ${stage.StageType.label}`}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
            aria-label={`Delete ${stage.StageType.label}`}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        {formatStageDateTime(stage.occurredAt, stage.durationMins)}
      </p>

      {interview && (
        <>
          <hr className="my-4" />
          <div className="grid gap-5 @lg/timeline:grid-cols-2">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wide text-muted-foreground">
                  INTERVIEWERS
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 cursor-pointer gap-1 px-2 text-xs"
                  onClick={onLinkInterviewers}
                >
                  <UserPlus className="h-3 w-3" />
                  Link
                </Button>
              </div>
              {stage.interviewers.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No interviewers linked yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {stage.interviewers.map((link) => (
                    <li key={link.id} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">
                        {stageInitials(link.Contact.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">
                          {link.Contact.name}
                        </span>
                        {link.Contact.title && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {link.Contact.title}
                          </span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer"
                        aria-label={`Unlink ${link.Contact.name}`}
                        onClick={() => unlink(link.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold tracking-wide text-muted-foreground">
                FORMAT
              </span>
              <p className="mt-2 flex items-center gap-2 text-sm">
                <Monitor className="h-3.5 w-3.5 shrink-0" />
                {[stage.format, stage.location].filter(Boolean).join(" · ") || "Not set"}
              </p>
            </div>
          </div>

          <hr className="my-4" />
          <StagePrepList
            stage={stage}
            onAddPrepQuestions={onAddPrepQuestions}
            onChanged={onChanged}
          />
        </>
      )}

      <hr className="my-4" />
      <div className="space-y-3">
        <div>
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground">
            OUTCOME
          </span>
          <p className="mt-1.5 text-sm">
            {outcomeLabel ? (
              <Badge variant="secondary">{outcomeLabel}</Badge>
            ) : (
              <span className="text-muted-foreground">Not recorded</span>
            )}
          </p>
        </div>
        <StageNotes stage={stage} onChanged={onChanged} />
      </div>

      <DeleteAlertDialog
        pageTitle="stage"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={onDelete}
        alertTitle={`Delete the ${stage.StageType.label} stage?`}
        alertDescription={
          isCurrent
            ? "This is the current stage. Deleting it makes the stage before it current, and the job's status follows that stage."
            : undefined
        }
      />
    </div>
  );
}
