import prisma from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { TaskGroupBy, TaskStatus } from "@/models/task.model";

export const TASK_WITH_ACTIVITIES_INCLUDE = {
  activityType: true,
  activities: {
    select: { id: true },
  },
} satisfies Prisma.TaskInclude;

export interface TaskListOptions {
  page?: number;
  limit?: number;
  activityTypeId?: string;
  activityTypeLabel?: string;
  statuses?: TaskStatus[];
  search?: string;
  groupBy?: TaskGroupBy;
}

function getTasksOrderBy(groupBy?: TaskGroupBy): Prisma.TaskOrderByWithRelationInput[] {
  switch (groupBy) {
    case "dueDate":
      return [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }];
    case "createdDate":
      return [{ createdAt: "desc" }, { priority: "desc" }];
    case "updatedDate":
      return [{ updatedAt: "desc" }, { priority: "desc" }, { createdAt: "desc" }];
    case "activityType":
      return [
        { activityType: { label: "asc" } },
        { priority: "desc" },
        { createdAt: "desc" },
      ];
    default:
      return [{ priority: "desc" }, { createdAt: "desc" }, { updatedAt: "desc" }];
  }
}

export async function listTasksForUser(userId: string, options: TaskListOptions = {}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 25;
  const where: Prisma.TaskWhereInput = { userId };

  if (options.activityTypeId) where.activityTypeId = options.activityTypeId;
  if (options.activityTypeLabel) {
    where.activityType = {
      value: options.activityTypeLabel.trim().toLowerCase(),
      createdBy: userId,
    };
  }
  if (options.statuses?.length) where.status = { in: options.statuses };
  if (options.search) {
    where.OR = [
      { title: { contains: options.search } },
      { description: { contains: options.search } },
      { activityType: { label: { contains: options.search } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: TASK_WITH_ACTIVITIES_INCLUDE,
      orderBy: getTasksOrderBy(options.groupBy),
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { data, total };
}

export function getTaskForUser(userId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, userId },
    include: TASK_WITH_ACTIVITIES_INCLUDE,
  });
}
