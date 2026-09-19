import prisma from "@/lib/db";
import type { TaskStatus } from "@/models/task.model";

const WITH_ACTIVITY_TYPE = { activityType: true } as const;

interface TaskValues {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: number;
  percentComplete: number;
  dueDate?: Date | null;
  activityTypeId?: string | null;
  activityTypeLabel?: string | null;
}

export type TaskPatch = Partial<TaskValues>;

export async function resolveActivityTypeForUser(userId: string, label: string) {
  const trimmedLabel = label.trim();
  const value = trimmedLabel.toLowerCase();

  return prisma.activityType.upsert({
    where: { value_createdBy: { value, createdBy: userId } },
    update: {},
    create: { label: trimmedLabel, value, createdBy: userId },
  });
}

async function assertActivityTypeOwned(userId: string, activityTypeId: string) {
  const activityType = await prisma.activityType.findFirst({
    where: { id: activityTypeId, createdBy: userId },
    select: { id: true },
  });
  if (!activityType) throw new Error("Activity type not found");
  return activityType.id;
}

async function resolveActivityTypeId(
  userId: string,
  values: Pick<TaskValues, "activityTypeId" | "activityTypeLabel">,
) {
  if (values.activityTypeLabel != null) {
    return (await resolveActivityTypeForUser(userId, values.activityTypeLabel)).id;
  }
  if (values.activityTypeId) {
    return assertActivityTypeOwned(userId, values.activityTypeId);
  }
  return values.activityTypeId ?? null;
}

export async function createTaskForUser(userId: string, values: TaskValues) {
  const activityTypeId = await resolveActivityTypeId(userId, values);

  return prisma.task.create({
    data: {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      percentComplete: values.percentComplete,
      dueDate: values.dueDate,
      activityTypeId,
      userId,
    },
    include: WITH_ACTIVITY_TYPE,
  });
}

export async function updateTaskForUser(
  userId: string,
  taskId: string,
  patch: TaskPatch,
) {
  const ownedTask = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  if (!ownedTask) throw new Error("Task not found");

  const data: TaskPatch & { activityTypeId?: string | null } = { ...patch };
  delete data.activityTypeLabel;

  if (patch.activityTypeLabel !== undefined) {
    data.activityTypeId =
      patch.activityTypeLabel === null
        ? null
        : (await resolveActivityTypeForUser(userId, patch.activityTypeLabel)).id;
  } else if (patch.activityTypeId) {
    data.activityTypeId = await assertActivityTypeOwned(userId, patch.activityTypeId);
  }

  if (patch.status === "complete" && patch.percentComplete === undefined) {
    data.percentComplete = 100;
  }

  return prisma.task.update({
    where: { id: taskId, userId },
    data,
    include: WITH_ACTIVITY_TYPE,
  });
}

export function completeTaskForUser(userId: string, taskId: string) {
  return prisma.task.update({
    where: { id: taskId, userId },
    data: { status: "complete", percentComplete: 100 },
    include: WITH_ACTIVITY_TYPE,
  });
}
