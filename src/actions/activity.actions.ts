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

export const getActivitiesList = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const data = await prisma.activity.findMany({
      where: {
        userId: user.id,
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
    });
    return { success: true, data };
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
