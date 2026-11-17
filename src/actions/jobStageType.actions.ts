"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "./shared";
import { APP_CONSTANTS } from "@/lib/constants";
import { resolveJobStageType } from "@/lib/jobs/resolve";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";
import { changeStageTypeStatus } from "@/lib/jobs/timeline";

export const getAllJobStageTypes = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    return await prisma.jobStageType.findMany({
      where: { createdBy: user.id },
      include: { Status: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
  } catch (error) {
    return handleError(error, "Failed to fetch stage types. ");
  }
};

// Not getReferenceEntityList: that helper counts jobs grouped by an FK on Job,
// and a stage type reaches Job only through JobStage.
export const getJobStageTypeList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  search?: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const whereClause: any = { createdBy: user.id };
    if (search) {
      whereClause.label = { contains: search, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      prisma.jobStageType.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: { Status: true, _count: { select: { stages: true } } },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }, { id: "desc" }],
      }),
      prisma.jobStageType.count({ where: whereClause }),
    ]);

    return { data, total };
  } catch (error) {
    return handleError(error, "Failed to fetch stage type list. ");
  }
};

const assertStatusExists = async (statusId: string) => {
  const status = await prisma.jobStatus.findUnique({
    where: { id: statusId },
    select: { id: true, label: true, value: true },
  });
  if (!status) throw new Error("Job status not found");
  return status;
};

// The types named after a job status are the lookup table the status menus
// resolve through (resolveStageTypeForStatusId keys on the status LABEL), so
// moving one under a different status would make every later status change
// write a stage whose status contradicts Job.statusId.
const isStatusNamedType = async (value: string): Promise<boolean> => {
  const statuses = await prisma.jobStatus.findMany({ select: { label: true } });
  return statuses.some((s) => canonicalizeEntityValue(s.label) === value);
};

export const createJobStageType = async (
  label: string,
  statusId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    await assertStatusExists(statusId);

    // resolveJobStageType returns an existing type by name and ignores the
    // requested status, which would report success having done nothing.
    const clash = await prisma.jobStageType.findFirst({
      where: {
        value: canonicalizeEntityValue(label.trim()),
        createdBy: user.id,
        NOT: { statusId },
      },
      select: { label: true, Status: { select: { label: true } } },
    });
    if (clash) {
      throw new Error(
        `"${clash.label}" already exists under the ${clash.Status.label} status.`,
      );
    }

    const data = await resolveJobStageType(label, user.id, statusId);
    return { success: true, data };
  } catch (error) {
    return handleError(error, "Failed to create stage type.");
  }
};

export const updateJobStageType = async (
  id: string,
  label: string,
  statusId: string,
  sortOrder: number,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    await assertStatusExists(statusId);

    const existing = await prisma.jobStageType.findFirst({
      where: { id, createdBy: user.id },
      select: { value: true, statusId: true },
    });
    if (!existing) throw new Error("Stage type not found");

    const statusChanged = existing.statusId !== statusId;
    if (statusChanged && (await isStatusNamedType(existing.value))) {
      throw new Error(
        `"${label.trim()}" is the stage the status menus resolve to, so its status cannot be changed.`,
      );
    }

    // value is left alone on rename: it is the reverse-lookup key that a
    // status resolves through, and rewriting it would orphan the mapping.
    if (statusChanged) {
      await changeStageTypeStatus({
        stageTypeId: id,
        userId: user.id,
        statusId,
        label: label.trim(),
        sortOrder,
      });
      return { success: true };
    }

    await prisma.jobStageType.update({
      where: { id, createdBy: user.id },
      data: { label: label.trim(), statusId, sortOrder },
    });

    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to update stage type.");
  }
};

export const deleteJobStageTypeById = async (
  id: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // JobStage.stageTypeId is required, so the database already refuses via
    // the default Restrict; this turns that into a readable message.
    const stages = await prisma.jobStage.count({
      where: { stageTypeId: id, Job: { userId: user.id } },
    });
    if (stages > 0) {
      throw new Error(
        `Stage type cannot be deleted due to ${stages} job stage${stages === 1 ? "" : "s"} using it! `,
      );
    }

    const res = await prisma.jobStageType.delete({
      where: { id, createdBy: user.id },
    });
    return { res, success: true };
  } catch (error) {
    return handleError(error, "Failed to delete stage type.");
  }
};
