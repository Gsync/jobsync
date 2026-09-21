// Not a "use server" module: job/queries.ts and company/queries.ts both map
// job rows through this, and exporting it from either would make it an action.

import { promoteStage } from "@/actions/jobStage/shared";

// An automation job saved without LLM analysis carries only its keyword
// pre-rank in matchScore, which the list must not show as an AI match. The
// matchData body is dropped so the list payload stays small.
export function hideUnanalyzedScore<
  T extends { matchScore: number | null; matchData: string | null },
>({ matchData, ...job }: T) {
  let analyzed = true;
  try {
    analyzed = JSON.parse(matchData ?? "{}").analyzed !== false;
  } catch {}
  return analyzed ? job : { ...job, matchScore: null };
}

type StatusStageTx = Parameters<typeof promoteStage>[0] & {
  jobStage: { findFirst: (args: any) => Promise<any>; create: (args: any) => Promise<any> };
};

// The status dropdowns' half of the derived-status invariant. Compares PARENT
// STATUS, not stage type: re-picking Interview while the current stage is
// "2nd Technical Interview" must append nothing (spec decision 16).
//
// stageTypeId is an argument, never resolved here: resolveStageTypeForStatusId
// writes through the base prisma client, and calling it inside the caller's
// transaction contends for SQLite's write lock (D4).
export async function appendStatusStage(
  tx: StatusStageTx,
  jobId: string,
  statusId: string,
  stageTypeId: string,
  userId: string,
): Promise<void> {
  const current = await tx.jobStage.findFirst({
    where: { jobId, isCurrent: true, Job: { userId } },
    select: {
      id: true,
      StageType: { select: { statusId: true, Status: { select: { value: true } } } },
    },
  });
  // With no current stage the job's own status is the one it holds. A
  // stage-less job (a pre-feature backup restore) must not collect a stage
  // dated today every time Edit Job is saved with the status untouched.
  const held = current
    ? current.StageType.statusId
    : (
        await tx.job.findFirst({
          where: { id: jobId, userId },
          select: { statusId: true },
        })
      )?.statusId;
  if (held === statusId) return;

  const stage = await tx.jobStage.create({
    data: { jobId, stageTypeId, occurredAt: new Date(), isCurrent: false },
  });
  await promoteStage(tx, jobId, stage.id, userId);
}
