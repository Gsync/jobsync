"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { TaskGroupBy, TaskStatus } from "@/models/task.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { requireUser } from "../shared";

const TASK_WITH_ACTIVITIES_INCLUDE = {
  activityType: true,
  activities: {
    select: { id: true },
  },
};

function getTasksOrderBy(groupBy?: TaskGroupBy) {
  switch (groupBy) {
    case "dueDate":
      return [
        // Undated tasks first, as SQLite sorted them; Postgres defaults last
        { dueDate: { sort: "asc" as const, nulls: "first" as const } },
        { priority: "desc" as const },
        { createdAt: "desc" as const },
        { id: "desc" as const },
      ];
    case "createdDate":
      return [
        { createdAt: "desc" as const },
        { priority: "desc" as const },
        { id: "desc" as const },
      ];
    case "updatedDate":
      return [
        { updatedAt: "desc" as const },
        { priority: "desc" as const },
        { createdAt: "desc" as const },
        { id: "desc" as const },
      ];
    case "activityType":
      return [
        { activityType: { label: "asc" as const } },
        { priority: "desc" as const },
        { createdAt: "desc" as const },
        { id: "desc" as const },
      ];
    default:
      return [
        { priority: "desc" as const },
        { createdAt: "desc" as const },
        { updatedAt: "desc" as const },
        { id: "desc" as const },
      ];
  }
}

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

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { activityType: { label: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        include: TASK_WITH_ACTIVITIES_INCLUDE,
        orderBy: getTasksOrderBy(groupBy),
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
    const user = await requireUser();

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
      },
      include: TASK_WITH_ACTIVITIES_INCLUDE,
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
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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
