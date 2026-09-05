import db from "@/lib/db";
import type { AutomationRunStatus } from "@/models/automation.model";
import { calculateNextRunAt } from "../schedule";
import type { RunnerResult } from "./types";

export interface FinalizeData {
  status: AutomationRunStatus;
  errorMessage?: string;
  blockedReason?: string;
  funnelStats?: string;
  jobsSearched: number;
  jobsDeduplicated: number;
  jobsProcessed: number;
  jobsMatched: number;
  jobsSaved: number;
}

export async function finalizeRun(
  runId: string,
  data: FinalizeData,
): Promise<RunnerResult> {
  const run = await db.automationRun.update({
    where: { id: runId },
    data: {
      status: data.status,
      errorMessage: data.errorMessage,
      blockedReason: data.blockedReason,
      funnelStats: data.funnelStats,
      jobsSearched: data.jobsSearched,
      jobsDeduplicated: data.jobsDeduplicated,
      jobsProcessed: data.jobsProcessed,
      jobsMatched: data.jobsMatched,
      jobsSaved: data.jobsSaved,
      completedAt: new Date(),
    },
  });

  await db.automation.update({
    where: { id: run.automationId },
    data: {
      lastRunAt: new Date(),
      nextRunAt: calculateNextRunAt(
        (
          await db.automation.findUnique({
            where: { id: run.automationId },
            select: { scheduleHour: true },
          })
        )?.scheduleHour || 8,
      ),
    },
  });

  return {
    runId: run.id,
    ...data,
  };
}
