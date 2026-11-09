import { jobFieldsForStage } from "./derive";

// Not re-exported: only index.ts may use these.

export type TimelineTx = {
  jobStage: {
    updateMany: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
  job: {
    findFirst: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
};

// Clear the old current row BEFORE setting the new one: the partial unique
// index JobStage_jobId_current_key refuses two live rows for one job.
//
// userId and jobId are in every where clause (D8). Callers check ownership first, but a
// helper that finds a row by id alone stays safe only until someone adds a
// caller that forgets, and CLAUDE.md's rule has no "the caller checked"
// exemption. updateMany, not update: a relation filter is not allowed in a
// single-row update's where.
export async function promoteStage(
  tx: TimelineTx,
  jobId: string,
  stageId: string,
  userId: string,
): Promise<void> {
  await tx.jobStage.updateMany({
    where: { jobId, isCurrent: true, NOT: { id: stageId }, Job: { userId } },
    data: { isCurrent: false },
  });
  const promoted = await tx.jobStage.updateMany({
    where: { id: stageId, jobId, Job: { userId } },
    data: { isCurrent: true },
  });
  if (promoted.count === 0) throw new Error("Stage not found");
}

// The derived-status invariant: Job.statusId always equals the current
// stage's type's statusId whenever a current stage exists.
export async function syncJobFromCurrentStage(
  tx: TimelineTx,
  jobId: string,
  stageId: string,
  userId: string,
): Promise<void> {
  const stage = await tx.jobStage.findFirst({
    where: { id: stageId, jobId, Job: { userId } },
    select: {
      occurredAt: true,
      StageType: {
        select: { statusId: true, Status: { select: { value: true } } },
      },
    },
  });
  if (!stage) throw new Error("Stage not found");

  const job = await tx.job.findFirst({
    where: { id: jobId, userId },
    select: { appliedDate: true },
  });

  // Prisma allows a non-unique field beside id in an update's where —
  // deleteJobById and updateJob both already do this.
  await tx.job.update({
    where: { id: jobId, userId },
    data: jobFieldsForStage(
      stage.StageType.Status.value,
      stage.StageType.statusId,
      stage.occurredAt,
      job?.appliedDate ?? null,
    ),
  });
}

// The status dropdowns' half of the derived-status invariant. Compares PARENT
// STATUS, not stage type: re-picking Interview while the current stage is
// "2nd Technical Interview" must append nothing (spec decision 16).
//
// stageTypeId is an argument, never resolved here: resolveStageTypeForStatusId
// writes through the base prisma client, and calling it inside the caller's
// transaction would write outside that transaction, so a rollback would not
// undo it (D4).
export async function appendStatusStage(
  tx: TimelineTx,
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
