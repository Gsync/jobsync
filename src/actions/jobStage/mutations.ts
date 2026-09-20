"use server";
import prisma from "@/lib/db";
import { handleError, combineDateAndTime } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { requireUser } from "../shared";
import { resolveJobStageType } from "@/lib/jobs/resolve";
import {
  AddJobStageFormSchema,
  type AddJobStageValues,
} from "@/models/jobStage.model";
import {
  STAGE_DETAIL_INCLUDE,
  assertStageOwned,
  promoteStage,
  sortStages,
  syncJobFromCurrentStage,
} from "./shared";

// Either the picked type (checked for ownership) or a resolved custom name.
// The parent status rides back out because format, duration and location are
// interview-only.
const resolveStageType = async (
  values: AddJobStageValues,
  userId: string,
): Promise<{ id: string; isInterview: boolean }> => {
  const custom = values.customLabel?.trim();
  const id = custom
    ? (await resolveJobStageType(custom, userId, values.customStatusId!)).id
    : values.stageTypeId!;
  const owned = await prisma.jobStageType.findFirst({
    where: { id, createdBy: userId },
    select: { id: true, Status: { select: { value: true } } },
  });
  if (!owned) throw new Error("Stage type not found");
  return { id: owned.id, isInterview: owned.Status.value === "interview" };
};

// The dialog hides format, duration and location for a non-interview stage
// and the detail panel never renders them, so a type change has to blank
// them rather than leave values saved where nothing can show or clear them.
const stageDataFrom = (
  values: AddJobStageValues,
  stageTypeId: string,
  isInterview: boolean,
) => ({
  stageTypeId,
  occurredAt: values.date
    ? values.time
      ? combineDateAndTime(values.date, values.time)
      : values.date
    : null,
  outcome: values.outcome ?? null,
  notes: values.notes?.trim() || null,
  durationMins: isInterview ? (values.durationMins ?? null) : null,
  format: isInterview ? values.format?.trim() || null : null,
  location: isInterview ? values.location?.trim() || null : null,
});

export const addJobStage = async (
  values: AddJobStageValues,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const parsed = AddJobStageFormSchema.parse(values);

    const job = await prisma.job.count({
      where: { id: parsed.jobId, userId: user.id },
    });
    if (job === 0) throw new Error("Job not found");

    const stageType = await resolveStageType(parsed, user.id);

    const created = await prisma.$transaction(async (tx: any) => {
      const stage = await tx.jobStage.create({
        data: {
          jobId: parsed.jobId,
          ...stageDataFrom(parsed, stageType.id, stageType.isInterview),
        },
      });
      if (parsed.setAsCurrent) {
        await promoteStage(tx, parsed.jobId, stage.id, user.id);
        await syncJobFromCurrentStage(tx, parsed.jobId, stage.id, user.id);
      }
      return tx.jobStage.findFirst({
        where: { id: stage.id },
        include: STAGE_DETAIL_INCLUDE,
      });
    });

    revalidatePath("/dashboard");
    return { success: true, data: created };
  } catch (error) {
    return handleError(error, "Failed to add stage.");
  }
};

export const updateJobStage = async (
  values: AddJobStageValues,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    if (!values.id) throw new Error("Stage id is required");
    const parsed = AddJobStageFormSchema.parse(values);

    const existing = await assertStageOwned(values.id, user.id);
    const stageType = await resolveStageType(parsed, user.id);

    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.jobStage.update({
        where: { id: values.id },
        data: stageDataFrom(parsed, stageType.id, stageType.isInterview),
      });
      if (parsed.setAsCurrent) {
        await promoteStage(tx, existing.jobId, values.id!, user.id);
      }
      // A current stage whose type or date changed re-derives the job's
      // status, so editing the type of the current stage is a status change.
      if (parsed.setAsCurrent || existing.isCurrent) {
        await syncJobFromCurrentStage(tx, existing.jobId, values.id!, user.id);
      }
      return tx.jobStage.findFirst({
        where: { id: values.id },
        include: STAGE_DETAIL_INCLUDE,
      });
    });

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error) {
    return handleError(error, "Failed to update stage.");
  }
};

export const deleteJobStage = async (
  stageId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const stage = await assertStageOwned(stageId, user.id);

    await prisma.$transaction(async (tx: any) => {
      await tx.jobStage.delete({ where: { id: stageId } });
      if (!stage.isCurrent) return;

      // Deleting the current stage promotes the furthest-along DATED stage;
      // with no stages left the job keeps its status and has no current stage.
      // Undated stages sort last within a sortOrder (D2), so simply taking the
      // tail would promote a dateless stage over a real one and set the wrong
      // status.
      const remaining = sortStages<{
        id: string;
        occurredAt: Date | null;
        createdAt: Date;
        StageType: { sortOrder: number };
      }>(
        await tx.jobStage.findMany({
          where: { jobId: stage.jobId },
          select: {
            id: true,
            occurredAt: true,
            createdAt: true,
            StageType: { select: { sortOrder: true } },
          },
        }),
      );
      const dated = remaining.filter((s) => s.occurredAt);
      const successor = dated[dated.length - 1] ?? remaining[remaining.length - 1];
      if (!successor) return;

      await promoteStage(tx, stage.jobId, successor.id, user.id);
      await syncJobFromCurrentStage(tx, stage.jobId, successor.id, user.id);
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to delete stage.");
  }
};

export const setCurrentJobStage = async (
  stageId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const stage = await assertStageOwned(stageId, user.id);

    await prisma.$transaction(async (tx: any) => {
      await promoteStage(tx, stage.jobId, stageId, user.id);
      await syncJobFromCurrentStage(tx, stage.jobId, stageId, user.id);
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to set the current stage.");
  }
};

// The detail panel edits notes in place, the way its prep checkboxes already
// save in place (Task 5.3). Its own action rather than updateJobStage: that
// one parses the whole Add Stage form, so a notes-only save would have to
// reconstruct a stage type, a date and a set-as-current flag it is not
// changing — and re-running promoteStage as a side effect of typing a note.
export const setStageNotes = async (
  stageId: string,
  notes: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    await assertStageOwned(stageId, user.id);

    const res = await prisma.jobStage.updateMany({
      where: { id: stageId, Job: { userId: user.id } },
      data: { notes: notes.trim() || null },
    });
    if (res.count === 0) throw new Error("Stage not found");

    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to save the note.");
  }
};
