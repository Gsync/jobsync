"use client";
import { Clock, MapPin, Monitor } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STAGE_OUTCOMES } from "@/lib/constants";
import type { JobStage } from "@/models/jobStage.model";
import { isInterviewStage } from "./stageDisplay";
import { StageNotes } from "./StageNotes";

type StageOverviewTabProps = {
  stage: JobStage;
  onChanged: () => void;
};

function StageFact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon: LucideIcon;
}) {
  return (
    <div>
      <span className="text-[11px] font-bold tracking-wide text-muted-foreground">
        {label}
      </span>
      <p className="mt-1.5 flex items-center gap-2 text-sm">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {value ?? <span className="text-muted-foreground">Not set</span>}
      </p>
    </div>
  );
}

export function StageOverviewTab({ stage, onChanged }: StageOverviewTabProps) {
  const outcomeLabel = STAGE_OUTCOMES.find(
    (o) => o.value === stage.outcome,
  )?.label;

  return (
    <div className="space-y-4">
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

      {isInterviewStage(stage) && (
        <div className="grid gap-4 @lg/timeline:grid-cols-3">
          <StageFact label="LOCATION" value={stage.location} icon={MapPin} />
          <StageFact label="FORMAT" value={stage.format} icon={Monitor} />
          <StageFact
            label="DURATION"
            value={stage.durationMins ? `${stage.durationMins} min` : null}
            icon={Clock}
          />
        </div>
      )}

      <StageNotes stage={stage} onChanged={onChanged} />
    </div>
  );
}
