"use client";

import { Loader2 } from "lucide-react";
import { useSlowResponseWarning } from "@/hooks/useSlowResponseWarning";
import { SlowResponseWarning } from "@/components/common/SlowResponseWarning";

// One row for every "the model is busy" moment in the transcript. Mounts and
// unmounts per gap, so the slow-response timer restarts with each wait.
export function AgentStatusRow({ label }: { label: string }) {
  const showSlowWarning = useSlowResponseWarning(true, false);

  return (
    <div className="rounded-sm border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{label}</span>
      </div>
      {showSlowWarning && <SlowResponseWarning />}
    </div>
  );
}
