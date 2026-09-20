"use client";
import { Check, Plus } from "lucide-react";
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

// The connector spans the two rows' padding, so it only lines up while the
// rows stay adjacent with no margin between them.
function StageMarker({
  state,
  hasNext,
  nextReached,
}: {
  state: "complete" | "current" | "upcoming";
  hasNext: boolean;
  nextReached: boolean;
}) {
  return (
    <span aria-hidden className="relative flex h-5 w-5 shrink-0 items-center justify-center">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full",
          state === "current"
            ? "bg-emerald-500 ring-4 ring-emerald-500/20 dark:bg-emerald-400 dark:ring-emerald-400/20"
            : state === "complete"
              ? "bg-emerald-500 dark:bg-emerald-400"
              : "border-2 border-border bg-card",
        )}
      >
        {state === "complete" && (
          <Check className="h-3 w-3 text-background" strokeWidth={3} />
        )}
      </span>
      {hasNext && (
        <span
          className={cn(
            "absolute left-1/2 top-full h-5 w-0.5 -translate-x-1/2",
            nextReached ? "bg-emerald-500 dark:bg-emerald-400" : "bg-border",
          )}
        />
      )}
    </span>
  );
}

export function StageHistoryList({
  stages,
  selectedStageId,
  currentStageId,
  terminalTypes,
  onSelect,
  onAddStage,
}: StageHistoryListProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStageId);

  return (
    <div className="rounded-lg border bg-card p-2.5">
      <h3 className="px-2.5 py-2 text-xs font-bold tracking-wide text-muted-foreground">
        STAGE HISTORY
      </h3>

      {/* The complete history lives here, and only here: every stage is
          reachable without a sideways scroll. */}
      <ul>
        {stages.map((stage, index) => {
          const isSelected = stage.id === selectedStageId;
          const isCurrent = stage.id === currentStageId;
          const isComplete = currentIndex >= 0 && index < currentIndex;
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
                <StageMarker
                  state={isCurrent ? "current" : isComplete ? "complete" : "upcoming"}
                  hasNext={index < stages.length - 1 || terminalTypes.length > 0}
                  nextReached={currentIndex >= 0 && index < currentIndex}
                />
                <span
                  className={cn(
                    "flex-1 truncate text-[13px] font-semibold",
                    isCurrent && "font-extrabold text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {stage.StageType.label}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    isCurrent
                      ? "font-bold text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {formatStageDate(stage.occurredAt)}
                </span>
                {isCurrent && <span className="sr-only">Current stage</span>}
              </button>
            </li>
          );
        })}

        {terminalTypes.map((type, index) => (
          <li
            key={type.id}
            className="flex items-center gap-2.5 p-2.5 text-muted-foreground"
          >
            <StageMarker
              state="upcoming"
              hasNext={index < terminalTypes.length - 1}
              nextReached={false}
            />
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
