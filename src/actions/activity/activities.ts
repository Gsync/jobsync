"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { Activity } from "@/models/activity.model";
import { revalidatePath } from "next/cache";
import { requireUser } from "./shared";

// Completed activities carry duration but no break state
const ACTIVITY_LIST_SELECT = {
  id: true,
  activityName: true,
  startTime: true,
  endTime: true,
  duration: true,
  description: true,
  createdAt: true,
  activityType: true,
};

export const getActivitiesList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  search?: string
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const offset = (page - 1) * limit;

    const whereClause: any = {
      userId: user.id,
      endTime: {
        not: null,
      },
    };

    if (search) {
      whereClause.OR = [
        { activityName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { activityType: { label: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.activity.findMany({
        where: whereClause,
        select: ACTIVITY_LIST_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: offset,
        take: limit,
      }),
      prisma.activity.count({
        where: whereClause,
      }),
    ]);

    return {
      success: true,
      data,
      total,
    };
  } catch (error) {
    const msg = "Failed to fetch activities list. ";
    return handleError(error, msg);
  }
};

export const createActivity = async (
  data: Activity
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const {
      activityName,
      activityType,
      startTime,
      endTime,
      duration,
      description,
    } = data;

    const activity = await prisma.activity.create({
      data: {
        activityName,
        activityTypeId: activityType as string,
        userId: user.id,
        startTime,
        endTime,
        duration,
        description,
      },
    });
    revalidatePath("/dashboard");
    return { activity, success: true };
  } catch (error) {
    const msg = "Failed to create activity. ";
    return handleError(error, msg);
  }
};

export const deleteActivityById = async (
  activityId: string
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const res = await prisma.activity.delete({
      where: {
        id: activityId,
        userId: user.id,
      },
    });
    revalidatePath("/dashboard");
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete job.";
    return handleError(error, msg);
  }
};
