import prisma from "@/lib/db";

export { sortStages } from "@/lib/jobs/sortStages";

// Not a "use server" module: queries.ts, mutations.ts, interviewers.ts and
// prep.ts all use these, and exporting them from any of those would make each
// one a callable server-action endpoint.

export const STAGE_DETAIL_INCLUDE = {
  StageType: { include: { Status: true } },
  interviewers: {
    include: {
      Contact: {
        select: {
          id: true,
          name: true,
          title: true,
          email: true,
          phone: true,
          linkedinUrl: true,
          lastContactedAt: true,
          Company: { select: { id: true, label: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  prepQuestions: {
    include: {
      Question: { select: { id: true, question: true, answer: true, tags: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

// The applied/appliedDate rules updateJobStatus has always used, lifted out so
// every stage write path keeps the dashboard and CSV export in agreement.
export function jobFieldsForStage(
  statusValue: string,
  statusId: string,
  occurredAt: Date | null,
  existingAppliedDate: Date | null,
): Record<string, unknown> {
  const data: Record<string, unknown> = { statusId };
  if (statusValue === "applied" || statusValue === "interview") {
    data.applied = true;
  }
  if (statusValue === "applied" && !existingAppliedDate) {
    data.appliedDate = occurredAt ?? new Date();
  }
  return data;
}

export type StageOwnerRow = {
  id: string;
  jobId: string;
  occurredAt: Date | null;
  isCurrent: boolean;
  StageType: { id: string; label: string; statusId: string; Status: { value: string } };
};

// JobStage has no ownership column, so the chain is the only check there is.
export async function assertStageOwned(
  stageId: string,
  userId: string,
): Promise<StageOwnerRow> {
  const stage = await prisma.jobStage.findFirst({
    where: { id: stageId, Job: { userId } },
    select: {
      id: true,
      jobId: true,
      occurredAt: true,
      isCurrent: true,
      StageType: {
        select: {
          id: true,
          label: true,
          statusId: true,
          Status: { select: { value: true } },
        },
      },
    },
  });
  if (!stage) throw new Error("Stage not found");
  return stage;
}

// The gate is on stage KIND and never on stage timing: preparing for an
// interview a week out is the primary case (spec decision 10).
export function assertInterviewStage(stage: StageOwnerRow): void {
  if (stage.StageType.Status.value !== "interview") {
    throw new Error(
      `"${stage.StageType.label}" is not an interview stage, so it has no interviewers or prep list.`,
    );
  }
}

type StageTx = {
  jobStage: {
    updateMany: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
  };
  job: {
    findFirst: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
};

// Clear the old current row BEFORE setting the new one: the partial unique
// index JobStage_jobId_current_key refuses two live rows for one job.
//
// userId is in every where clause (D8). Callers check ownership first, but a
// helper that finds a row by id alone stays safe only until someone adds a
// caller that forgets, and CLAUDE.md's rule has no "the caller checked"
// exemption. updateMany, not update: a relation filter is not allowed in a
// single-row update's where.
export async function promoteStage(
  tx: StageTx,
  jobId: string,
  stageId: string,
  userId: string,
): Promise<void> {
  await tx.jobStage.updateMany({
    where: { jobId, isCurrent: true, NOT: { id: stageId }, Job: { userId } },
    data: { isCurrent: false },
  });
  const promoted = await tx.jobStage.updateMany({
    where: { id: stageId, Job: { userId } },
    data: { isCurrent: true },
  });
  if (promoted.count === 0) throw new Error("Stage not found");
}

// The derived-status invariant: Job.statusId always equals the current
// stage's type's statusId whenever a current stage exists.
export async function syncJobFromCurrentStage(
  tx: StageTx,
  jobId: string,
  stageId: string,
  userId: string,
): Promise<void> {
  const stage = await tx.jobStage.findFirst({
    where: { id: stageId, Job: { userId } },
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
