"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { requireUser } from "./shared";

export const getAllActivityTypes = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const activityTypes = await prisma.activityType.findMany({
      where: {
        createdBy: user.id,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return activityTypes;
  } catch (error) {
    const msg = "Failed to fetch all activity types. ";
    return handleError(error, msg);
  }
};

export const createActivityType = async (
  label: string
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const value = label.trim().toLowerCase();

    const upsertedActivityType = await prisma.activityType.upsert({
      where: { value_createdBy: { value, createdBy: user.id } },
      update: { label },
      create: { label, value, createdBy: user.id },
    });

    return upsertedActivityType;
  } catch (error) {
    const msg = "Failed to create activity type. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getActivityTypeList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const skip = (page - 1) * limit;
    const whereClause = { createdBy: user.id };

    const [total, durationSums] = await Promise.all([
      prisma.activityType.count({ where: whereClause }),
      prisma.activity.groupBy({
        by: ["activityTypeId"],
        where: { userId: user.id, endTime: { not: null } },
        _sum: { duration: true },
      }),
    ]);

    const durationMap = new Map(
      durationSums.map((d) => [d.activityTypeId, d._sum.duration ?? 0]),
    );

    // Fetch all activity types with counts, then sort by total duration
    const allTypes = await prisma.activityType.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        label: true,
        value: true,
        _count: { select: { Activities: true, Tasks: true } },
      },
    });

    const sorted = allTypes
      .map((t) => ({ ...t, totalDuration: durationMap.get(t.id) ?? 0 }))
      .sort((a, b) => b.totalDuration - a.totalDuration);

    const data = sorted.slice(skip, skip + limit);

    return { data, total };
  } catch (error) {
    const msg = "Failed to fetch activity type list. ";
    return handleError(error, msg);
  }
};

export const deleteActivityTypeById = async (
  activityTypeId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const [activities, tasks] = await Promise.all([
      prisma.activity.count({ where: { activityTypeId, userId: user.id } }),
      prisma.task.count({ where: { activityTypeId, userId: user.id } }),
    ]);

    if (activities > 0 || tasks > 0) {
      const links = [
        activities > 0 ? `${activities} activity(ies)` : "",
        tasks > 0 ? `${tasks} task(s)` : "",
      ]
        .filter(Boolean)
        .join(" and ");

      throw new Error(
        `Activity type cannot be deleted because it is linked to ${links}.`,
      );
    }

    const res = await prisma.activityType.delete({
      where: { id: activityTypeId, createdBy: user.id },
    });

    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete activity type.";
    return handleError(error, msg);
  }
};
