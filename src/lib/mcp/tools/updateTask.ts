import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { serializeTask, taskJson } from "@/lib/mcp/tools/taskResult";
import { plainTextToTiptapHtml } from "@/lib/tasks/description";
import { updateTaskForUser, type TaskPatch } from "@/lib/tasks/mutations";
import type { McpUpdateTaskInput } from "@/models/mcp.schema";

export async function handleUpdateTask(input: McpUpdateTaskInput, userId: string) {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    return taskJson({
      error: "rate_limit_exceeded",
      retryAfterSeconds: Math.ceil(rateCheck.resetIn / 1000),
    });
  }

  try {
    const patch: TaskPatch = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) {
      patch.description = plainTextToTiptapHtml(input.description);
    }
    if (input.status !== undefined) patch.status = input.status;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.percentComplete !== undefined) {
      patch.percentComplete = input.percentComplete;
    }
    if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
    if (input.activityType !== undefined) {
      patch.activityTypeLabel = input.activityType;
    }

    const task = await updateTaskForUser(userId, input.taskId, patch);
    return taskJson({ task: serializeTask(task) });
  } catch (error: any) {
    return taskJson({ error: error?.message ?? "Failed to update task" });
  }
}
