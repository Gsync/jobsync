"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { TaskGroupBy, TaskStatus } from "@/models/task.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { getTaskForUser, listTasksForUser } from "@/lib/tasks/queries";
import { requireUser } from "../shared";

export const getTasksList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  filter?: string,
  statusFilter?: TaskStatus[],
  search?: string,
  groupBy?: TaskGroupBy
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const { data, total } = await listTasksForUser(user.id, {
      page,
      limit,
      activityTypeId: filter,
      statuses: statusFilter,
      search,
      groupBy,
    });

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
    const user = await requireUser();

    const task = await getTaskForUser(user.id, taskId);

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

export const getActivityTypesWithTaskCounts = async (): Promise<
  any | undefined
> => {
  try {
    const user = await requireUser();

    const excludedStatuses = ["complete", "cancelled"];

    const activityTypes = await prisma.activityType.findMany({
      where: {
        createdBy: user.id,
      },
      include: {
        _count: {
          select: {
            Tasks: {
              where: {
                status: { notIn: excludedStatuses },
              },
            },
          },
        },
      },
    });

    const data = activityTypes
      .map((type) => ({
        id: type.id,
        label: type.label,
        value: type.value,
        taskCount: type._count.Tasks,
      }))
      .sort((a, b) => b.taskCount - a.taskCount);

    const totalTasks = await prisma.task.count({
      where: {
        userId: user.id,
        status: { notIn: excludedStatuses },
      },
    });

    return { success: true, data, totalTasks };
  } catch (error) {
    const msg = "Failed to fetch activity types with task counts.";
    return handleError(error, msg);
  }
};
