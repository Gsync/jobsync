import { toPlainText } from "@/lib/tasks/description";

interface TaskResultInput {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  percentComplete: number;
  dueDate: Date | null;
  activityType: { id: string; label: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeTask(task: TaskResultInput) {
  return {
    id: task.id,
    title: task.title,
    description: toPlainText(task.description),
    status: task.status,
    priority: task.priority,
    percentComplete: task.percentComplete,
    dueDate: task.dueDate?.toISOString() ?? null,
    activityType: task.activityType
      ? { id: task.activityType.id, label: task.activityType.label }
      : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function taskJson(value: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}
