"use client";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { JobStage, JobStageTypeRef } from "@/models/jobStage.model";
import { formatStageDate } from "./stageDisplay";

type StageHistoryListProps = {
  stages: JobStage[];
  selectedStageId: string | null;
  currentStageId: string | null;
  terminalTypes: JobStageTypeRef[];
  onSelect: (stageId: string) => void;
  onAddStage: () => void;
};

export function StageHistoryList({
  stages,
  selectedStageId,
  currentStageId,
  terminalTypes,
  onSelect,
  onAddStage,
}: StageHistoryListProps) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <h3 className="px-2.5 py-2 text-xs font-bold tracking-wide text-muted-foreground">
        STAGE HISTORY
      </h3>

      {/* The complete history lives here, not in the stepper: nothing is
          reachable only by scrolling the stepper sideways. */}
      <ul>
        {stages.map((stage) => {
          const isSelected = stage.id === selectedStageId;
          const isCurrent = stage.id === currentStageId;
          return (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => onSelect(stage.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-md p-2.5 text-left",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    isCurrent ? "bg-primary" : "bg-emerald-500 dark:bg-emerald-400",
                  )}
                />
                <span
                  className={cn(
                    "flex-1 truncate text-[13px] font-semibold",
                    isCurrent && "font-extrabold text-primary",
                  )}
                >
                  {stage.StageType.label}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    isCurrent ? "font-bold text-primary" : "text-muted-foreground",
                  )}
                >
                  {formatStageDate(stage.occurredAt)}
                </span>
                {isCurrent && <span className="sr-only">Current stage</span>}
              </button>
            </li>
          );
        })}

        {terminalTypes.map((type) => (
          <li
            key={type.id}
            className="flex items-center gap-2.5 p-2.5 text-muted-foreground"
          >
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full border-2 border-border" />
            <span className="flex-1 truncate text-[13px] font-semibold">
              {type.label}
            </span>
            <span className="text-xs">—</span>
          </li>
        ))}
      </ul>

      <Button
        variant="outline"
        className="mt-1.5 w-full cursor-pointer border-dashed"
        onClick={onAddStage}
        data-testid="timeline-add-stage-btn"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add stage
      </Button>
    </div>
  );
}
