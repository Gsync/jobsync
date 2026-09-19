"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobStage, JobStageTypeRef } from "@/models/jobStage.model";
import { formatStageDate } from "./stageDisplay";

type StageStepperProps = {
  stages: JobStage[];
  selectedStageId: string | null;
  currentStageId: string | null;
  terminalTypes: JobStageTypeRef[];
  onSelect: (stageId: string) => void;
};

export function StageStepper({
  stages,
  selectedStageId,
  currentStageId,
  terminalTypes,
  onSelect,
}: StageStepperProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStageId);

  return (
    // Container query, not a viewport breakpoint: the docked chat panel
    // narrows this column without changing the viewport width.
    <div className="@container/stepper rounded-lg border bg-card p-6">
      <div className="flex min-w-max items-start overflow-x-auto pb-2">
        {stages.map((stage, index) => {
          const isCurrent = stage.id === currentStageId;
          const isComplete = currentIndex >= 0 && index < currentIndex;
          const isSelected = stage.id === selectedStageId;
          return (
            <div key={stage.id} className="flex items-start">
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "mt-[15px] h-0.5 w-10 shrink-0 @lg/stepper:w-14",
                    isCurrent
                      ? "bg-primary"
                      : isComplete
                        ? "bg-emerald-500 dark:bg-emerald-400"
                        : "bg-border",
                  )}
                />
              )}
              <button
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onSelect(stage.id)}
                className={cn(
                  "flex w-24 shrink-0 flex-col items-center gap-2 px-2 text-center",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md cursor-pointer",
                  isSelected && "bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    isCurrent
                      ? "bg-primary ring-4 ring-primary/20"
                      : isComplete
                        ? "bg-emerald-500 dark:bg-emerald-400"
                        : "border-2 border-border bg-card",
                  )}
                >
                  {isComplete && (
                    <Check className="h-4 w-4 text-background" strokeWidth={3} />
                  )}
                </span>
                {/* One line, truncated: the rail's baseline breaks if a long
                    label wraps, and the history list below carries it in full. */}
                <span
                  title={stage.StageType.label}
                  className={cn(
                    "w-full truncate text-[13px] font-semibold",
                    isCurrent && "font-extrabold text-primary",
                  )}
                >
                  {stage.StageType.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatStageDate(stage.occurredAt)}
                </span>
              </button>
            </div>
          );
        })}

        {terminalTypes.map((type) => (
          <div key={type.id} className="flex items-start">
            <span aria-hidden className="mt-[15px] h-0.5 w-10 shrink-0 bg-border @lg/stepper:w-14" />
            <div className="flex w-24 shrink-0 flex-col items-center gap-2 px-2 text-center">
              <span className="h-8 w-8 rounded-full border-2 border-border bg-card" />
              <span
                title={type.label}
                className="w-full truncate text-[13px] font-semibold text-muted-foreground"
              >
                {type.label}
              </span>
              <span className="text-[11px] text-muted-foreground">—</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
