"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { Activity } from "@/models/activity.model";
import { AddActivityFormSchema } from "@/models/addActivityForm.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { z } from "zod";

export const getAllActivityTypes = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const activityTypes = await prisma.activityType.findMany({
      where: {
        createdBy: user.id,
      },
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
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const value = label.trim().toLowerCase();

    const upsertedActivityType = await prisma.activityType.upsert({
      where: { value, createdBy: user.id },
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

export const getActivitiesList = async (
  page: number = 1,
  limit: number = 10
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId: user.id,
          endTime: {
            not: null,
          },
        },
        select: {
          id: true,
          activityName: true,
          startTime: true,
          endTime: true,
          duration: true,
          description: true,
          createdAt: true,
          activityType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
      }),
      prisma.activity.count({
        where: {
          userId: user.id,
          endTime: {
            not: null,
          },
        },
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
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

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
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const res = await prisma.activity.delete({
      where: {
        id: activityId,
        userId: user.id,
      },
    });
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete job.";
    return handleError(error, msg);
  }
};

export const startActivityById = async (
  activityId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        userId: user.id,
      },
    });

    if (!activity) {
      throw new Error("Activity not found");
    }
    const { activityName, activityTypeId, description } = activity;

    const newActivity = await prisma.activity.create({
      data: {
        activityName,
        activityTypeId,
        userId: user.id,
        startTime: new Date(),
        endTime: null,
        description,
      },
      select: {
        id: true,
        activityName: true,
        startTime: true,
        endTime: true,
        description: true,
        createdAt: true,
        activityType: true,
      },
    });
    return { newActivity, success: true };
  } catch (error) {
    const msg = "Failed to start activity. ";
    return handleError(error, msg);
  }
};

export const stopActivityById = async (
  activityId: string,
  endTime: Date,
  duration: number
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const activity = await prisma.activity.update({
      where: {
        id: activityId,
        userId: user.id,
      },
      data: {
        endTime,
        duration,
      },
    });
    return { activity, success: true };
  } catch (error) {
    const msg = "Failed to start activity. ";
    return handleError(error, msg);
  }
};

export const getCurrentActivity = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const activity = await prisma.activity.findFirst({
      where: {
        userId: user.id,
        endTime: null,
      },
      select: {
        id: true,
        activityName: true,
        startTime: true,
        description: true,
        createdAt: true,
        activityType: true,
      },
    });

    if (!activity) {
      return { success: false };
    }

    return { activity, success: true };
  } catch (error) {
    const msg = "Failed to get current activity. ";
    return handleError(error, msg);
  }
};
