"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "./shared";
import { APP_CONSTANTS } from "@/lib/constants";
import { resolveJobStageType } from "@/lib/jobs/resolve";

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
      whereClause.label = { contains: search };
    }

    const [data, total] = await Promise.all([
      prisma.jobStageType.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: { Status: true, _count: { select: { stages: true } } },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      }),
      prisma.jobStageType.count({ where: whereClause }),
    ]);

    return { data, total };
  } catch (error) {
    return handleError(error, "Failed to fetch stage type list. ");
  }
};

const assertStatusExists = async (statusId: string) => {
  const status = await prisma.jobStatus.count({ where: { id: statusId } });
  if (status === 0) throw new Error("Job status not found");
};

export const createJobStageType = async (
  label: string,
  statusId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    await assertStatusExists(statusId);
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
    // value is left alone on rename: it is the reverse-lookup key that a
    // status resolves through, and rewriting it would orphan the mapping.
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
