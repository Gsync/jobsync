"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { Task, TaskStatus } from "@/models/task.model";
import { AddTaskFormSchema } from "@/models/addTaskForm.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { z } from "zod";

export const getTasksList = async (
  page: number = 1,
  limit: number = 10,
  filter?: string,
  statusFilter?: TaskStatus[]
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const offset = (page - 1) * limit;

    const whereClause: any = {
      userId: user.id,
    };

    if (filter) {
      whereClause.activityTypeId = filter;
    }

    if (statusFilter && statusFilter.length > 0) {
      whereClause.status = { in: statusFilter };
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        include: {
          activityType: true,
          activity: {
            select: { id: true },
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip: offset,
        take: limit,
      }),
      prisma.task.count({
        where: whereClause,
      }),
    ]);

    return {
      success: true,
      data,
      total,
    };
  } catch (error) {
    const msg = "Failed to fetch tasks list.";
    return handleError(error, msg);
  }
};

export const getTaskById = async (
  taskId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
      },
      include: {
        activityType: true,
        activity: {
          select: { id: true },
        },
      },
    });

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    return {
      success: true,
      data: task,
    };
  } catch (error) {
    const msg = "Failed to fetch task.";
    return handleError(error, msg);
  }
};

export const createTask = async (
  data: z.infer<typeof AddTaskFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const validatedData = AddTaskFormSchema.parse(data);

    const task = await prisma.task.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        status: validatedData.status,
        priority: validatedData.priority,
        percentComplete: validatedData.percentComplete,
        dueDate: validatedData.dueDate,
        activityTypeId: validatedData.activityTypeId,
        userId: user.id,
      },
      include: {
        activityType: true,
      },
    });

    return { success: true, data: task };
  } catch (error) {
    const msg = "Failed to create task.";
    return handleError(error, msg);
  }
};

export const updateTask = async (
  data: z.infer<typeof AddTaskFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    if (!data.id) {
      throw new Error("Task ID is required for update");
    }

    const validatedData = AddTaskFormSchema.parse(data);

    const task = await prisma.task.update({
      where: {
        id: data.id,
        userId: user.id,
      },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        status: validatedData.status,
        priority: validatedData.priority,
        percentComplete: validatedData.percentComplete,
        dueDate: validatedData.dueDate,
        activityTypeId: validatedData.activityTypeId,
      },
      include: {
        activityType: true,
      },
    });

    return { success: true, data: task };
  } catch (error) {
    const msg = "Failed to update task.";
    return handleError(error, msg);
  }
};

export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const task = await prisma.task.update({
      where: {
        id: taskId,
        userId: user.id,
      },
      data: {
        status,
      },
      include: {
        activityType: true,
      },
    });

    return { success: true, data: task };
  } catch (error) {
    const msg = "Failed to update task status.";
    return handleError(error, msg);
  }
};

export const deleteTaskById = async (
  taskId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
      },
      include: {
        activity: true,
      },
    });

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    if (task.activity) {
      return {
        success: false,
        message:
          "Cannot delete task with linked activity. Remove the activity first.",
      };
    }

    await prisma.task.delete({
      where: {
        id: taskId,
        userId: user.id,
      },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to delete task.";
    return handleError(error, msg);
  }
};

export const startActivityFromTask = async (
  taskId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
      },
      include: {
        activity: true,
      },
    });

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    if (task.activity) {
      return {
        success: false,
        message: "Task already has a linked activity.",
      };
    }

    if (!task.activityTypeId) {
      return {
        success: false,
        message: "Task must have an activity type to start an activity.",
      };
    }

    if (task.status === "complete" || task.status === "cancelled") {
      return {
        success: false,
        message: "Cannot start an activity from a completed or cancelled task.",
      };
    }

    const runningActivity = await prisma.activity.findFirst({
      where: {
        userId: user.id,
        endTime: null,
      },
    });

    if (runningActivity) {
      return {
        success: false,
        message:
          "You already have a running activity. Please stop it before starting a new one.",
      };
    }

    const activity = await prisma.activity.create({
      data: {
        activityName: task.title,
        activityTypeId: task.activityTypeId,
        userId: user.id,
        startTime: new Date(),
        endTime: null,
        taskId: task.id,
      },
      include: {
        activityType: true,
      },
    });

    return { success: true, data: activity };
  } catch (error) {
    const msg = "Failed to start activity from task.";
    return handleError(error, msg);
  }
};

export const getActivityTypesWithTaskCounts = async (): Promise<
  any | undefined
> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const activityTypes = await prisma.activityType.findMany({
      where: {
        createdBy: user.id,
      },
      include: {
        _count: {
          select: { Tasks: true },
        },
      },
    });

    const data = activityTypes.map((type) => ({
      id: type.id,
      label: type.label,
      value: type.value,
      taskCount: type._count.Tasks,
    }));

    const totalTasks = await prisma.task.count({
      where: { userId: user.id },
    });

    return { success: true, data, totalTasks };
  } catch (error) {
    const msg = "Failed to fetch activity types with task counts.";
    return handleError(error, msg);
  }
};
