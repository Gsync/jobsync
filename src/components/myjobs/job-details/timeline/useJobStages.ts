"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getJobStages } from "@/actions/jobStage.actions";
import { sortStages } from "@/lib/jobs/sortStages";
import type { JobStage } from "@/models/jobStage.model";

// Lives in JobDetails' scope, not the tab's: the header's Update Status menu
// is visible on every tab and targets the same selected stage.
export function useJobStages(jobId: string, initial: JobStage[]) {
  // The server prop comes from JOB_DETAILS_INCLUDE, which carries no orderBy
  // and could not usefully have one (D2) — without this every job opens with
  // a scrambled stepper until the first write triggers a refetch.
  const [stages, setStages] = useState<JobStage[]>(() => sortStages(initial));
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const currentStage = useMemo(
    () => stages.find((s) => s.isCurrent) ?? null,
    [stages],
  );

  // Selection defaults to the current stage, and re-homes when the selected
  // stage is deleted rather than leaving the panel pointed at nothing.
  useEffect(() => {
    if (selectedStageId && stages.some((s) => s.id === selectedStageId)) return;
    setSelectedStageId(currentStage?.id ?? stages[0]?.id ?? null);
  }, [stages, selectedStageId, currentStage]);

  const selectedStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId) ?? null,
    [stages, selectedStageId],
  );

  // getJobStages already sorts, but sorting again is free and keeps the one
  // rule ("this list is always sorted") true of every path into setStages.
  const reload = useCallback(async () => {
    const fresh = await getJobStages(jobId);
    if (Array.isArray(fresh)) setStages(sortStages(fresh));
  }, [jobId]);

  return {
    stages,
    currentStage,
    selectedStage,
    selectedStageId,
    selectStage: setSelectedStageId,
    reload,
  };
}
