import db from "@/lib/db";
import { recordRunNotifications } from "@/lib/notifications/record";
import type { AutomationRunStatus } from "@/models/automation.model";
import { calculateNextRunAt } from "../schedule";
import type { BoardFailure, RunnerResult } from "./types";

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
  // Forwarded to notifications only; not persisted on AutomationRun.
  boardErrors?: BoardFailure[];
  aiError?: string;
}

export async function finalizeRun(
  runId: string,
  data: FinalizeData,
): Promise<RunnerResult> {
  // Before the terminal update: the run watcher refreshes the bell the
  // moment it sees a terminal status.
  await recordRunNotifications(runId, data);
  const { boardErrors: _boardErrors, aiError: _aiError, ...result } = data;
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
    ...result,
  };
}
