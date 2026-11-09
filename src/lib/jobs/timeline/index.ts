import type { Job } from "@prisma/client";
import prisma from "@/lib/db";
import { APPLIED_STATUS_VALUES } from "@/lib/constants";
import { resolveStageTypeForStatusId } from "@/lib/jobs/resolve";
import { jobFieldsForStage } from "./derive";
import {
  appendStatusStage,
  promoteStage,
  syncJobFromCurrentStage,
  type TimelineTx,
} from "./internal";

// Not a "use server" module: callers are actions, MCP, automation and mocks.

export class JobNotFoundError extends Error {
  constructor() {
    super("Job not found");
  }
}

export type ChangeJobStatusInput = {
  jobId: string;
  userId: string;
  statusId: string;
  // Other columns, written in the same update
  jobFields?: Record<string, unknown>;
  // Edit Job only: the date the form sent, null when cleared
  appliedDateFromUser?: Date | null;
  // MCP/agent only: hand-added jobs have createdVia null and stay off limits
  requireCreatedVia?: boolean;
};

// Edit Job: clearing the date un-applies the job, unless its status or an
// earlier stage says it was applied to (Offer then Rejected keeps it applied).
function editJobData(
  input: ChangeJobStatusInput,
  value: string,
  storedStatusId: string,
  appliedStages: number,
) {
  const { jobFields, statusId, appliedDateFromUser } = input;
  const appliedDate = appliedDateFromUser ?? null;
  return {
    ...jobFields,
    statusId,
    appliedDate,
    ...(storedStatusId !== statusId &&
      jobFieldsForStage(value, statusId, null, appliedDate)),
    applied:
      !!appliedDate ||
      APPLIED_STATUS_VALUES.includes(value) ||
      appliedStages > 0,
  };
}

function defaultData(
  input: ChangeJobStatusInput,
  value: string,
  storedAppliedDate: Date | null,
) {
  const { jobFields = {}, statusId } = input;
  const existing =
    "appliedDate" in jobFields
      ? (jobFields.appliedDate as Date | null)
      : storedAppliedDate;
  return {
    ...jobFields,
    ...jobFieldsForStage(value, statusId, null, existing),
  };
}

// A new Applied stage carries the applied date this save brings, if any.
function newStageDate(input: ChangeJobStatusInput, value: string): Date {
  if (value !== "applied") return new Date();
  return (
    input.appliedDateFromUser ??
    (input.jobFields?.appliedDate as Date | null | undefined) ??
    new Date()
  );
}

export async function changeJobStatus(
  input: ChangeJobStatusInput,
): Promise<Job> {
  const { jobId, userId, statusId, appliedDateFromUser } = input;
  const where = {
    id: jobId,
    userId,
    ...(input.requireCreatedVia && { createdVia: { not: null } }),
  };

  const owned = await prisma.job.findFirst({ where, select: { id: true } });
  if (!owned) throw new JobNotFoundError();

  // Outside the transaction on purpose: this resolve can create a row, and
  // it writes through the base client (D4).
  const stageTypeId = await resolveStageTypeForStatusId(statusId, userId);
  const status = await prisma.jobStatus.findUnique({
    where: { id: statusId },
    select: { value: true },
  });
  const value = status?.value ?? "";

  return prisma.$transaction(async (tx: any) => {
    const stored = await tx.job.findFirst({
      where,
      select: { statusId: true, appliedDate: true },
    });
    if (!stored) throw new JobNotFoundError();

    // Counted before appending, so the stage added now cannot vouch for itself
    const appliedStages =
      appliedDateFromUser === undefined
        ? 0
        : await tx.jobStage.count({
            where: {
              jobId,
              Job: { userId },
              StageType: {
                Status: { value: { in: [...APPLIED_STATUS_VALUES] } },
              },
            },
          });

    await appendStatusStage(tx, {
      jobId,
      statusId,
      stageTypeId,
      userId,
      occurredAt: newStageDate(input, value),
    });
    const data =
      appliedDateFromUser === undefined
        ? defaultData(input, value, stored.appliedDate)
        : editJobData(input, value, stored.statusId, appliedStages);
    return tx.job.update({ where, data });
  });
}

// The caller owns the stage row write and its transaction, so the row and the
// promotion commit together. Nothing here resolves a stage type (no D4 risk).
export async function setJobCurrentStage(
  tx: TimelineTx,
  input: { jobId: string; stageId: string; userId: string },
): Promise<void> {
  const { jobId, stageId, userId } = input;
  await promoteStage(tx, jobId, stageId, userId);
  await syncJobFromCurrentStage(tx, jobId, stageId, userId);
}

export type ChangeStageTypeStatusInput = {
  stageTypeId: string;
  userId: string;
  statusId: string;
  label: string;
  sortOrder: number;
};

// A job's status is derived from its current stage's type, so retargeting a
// type in use re-derives every job sitting on it, all or nothing.
export async function changeStageTypeStatus(
  input: ChangeStageTypeStatusInput,
): Promise<void> {
  const { stageTypeId, userId, statusId, label, sortOrder } = input;
  await prisma.$transaction(async (tx: any) => {
    await tx.jobStageType.update({
      where: { id: stageTypeId, createdBy: userId },
      data: { label, statusId, sortOrder },
    });
    const status = await tx.jobStatus.findUnique({
      where: { id: statusId },
      select: { value: true },
    });
    const affected = await tx.job.findMany({
      where: {
        userId,
        stages: { some: { stageTypeId, isCurrent: true } },
      },
      select: {
        id: true,
        appliedDate: true,
        stages: {
          where: { stageTypeId, isCurrent: true },
          select: { occurredAt: true },
        },
      },
    });
    for (const job of affected) {
      await tx.job.update({
        where: { id: job.id, userId },
        data: jobFieldsForStage(
          status?.value ?? "",
          statusId,
          job.stages[0]?.occurredAt ?? null,
          job.appliedDate,
        ),
      });
    }
  });
}

// Both lookups finish before this returns, so the caller's nested create never
// runs the resolver inside its implicit transaction (D4).
export async function initialTimelineForNewJob(input: {
  statusId: string;
  userId: string;
  occurredAt: Date;
  appliedDate?: Date | null;
}) {
  const { statusId, userId, occurredAt, appliedDate } = input;
  const stageTypeId = await resolveStageTypeForStatusId(statusId, userId);
  const status = await prisma.jobStatus.findUnique({
    where: { id: statusId },
    select: { value: true },
  });
  const value = status?.value ?? "";
  const stageDate = value === "applied" && appliedDate ? appliedDate : occurredAt;
  return {
    stages: {
      create: { stageTypeId, occurredAt: stageDate, isCurrent: true as const },
    },
    jobFields: jobFieldsForStage(
      value,
      statusId,
      null,
      appliedDate ?? null,
    ),
  };
}
