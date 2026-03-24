import { ActivityType } from "./activity.model";

export const TASK_STATUSES = {
  "in-progress": "In Progress",
  "complete": "Complete",
  "needs-attention": "Needs Attention",
  "cancelled": "Cancelled",
} as const;

export type TaskStatus = keyof typeof TASK_STATUSES;

/** Maps each TaskStatus to its i18n translation key in the tasks dictionary. */
export const TASK_STATUS_LABEL_KEYS: Record<TaskStatus, string> = {
  "in-progress": "tasks.statusInProgress",
  "complete": "tasks.statusComplete",
  "needs-attention": "tasks.statusNeedsAttention",
  "cancelled": "tasks.statusCancelled",
};

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: number;
  percentComplete: number;
  dueDate?: Date | null;
  activityTypeId?: string | null;
  activityType?: ActivityType | null;
  activity?: { id: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithActivityType extends Task {
  activityType: ActivityType | null;
}
