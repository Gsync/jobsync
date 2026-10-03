import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { serializeTask, taskJson } from "@/lib/mcp/tools/taskResult";
import { plainTextToTiptapHtml } from "@/lib/tasks/description";
import { createTaskForUser } from "@/lib/tasks/mutations";
import type { McpCreateTaskInput } from "@/models/mcp.schema";

export async function handleCreateTask(input: McpCreateTaskInput, userId: string) {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    return taskJson({
      error: "rate_limit_exceeded",
      retryAfterSeconds: Math.ceil(rateCheck.resetIn / 1000),
    });
  }

  try {
    const task = await createTaskForUser(userId, {
      title: input.title,
      description: plainTextToTiptapHtml(input.description),
      status: input.status,
      priority: input.priority,
      percentComplete: input.percentComplete,
      dueDate: input.dueDate,
      activityTypeLabel: input.activityType,
    });
    return taskJson({ task: serializeTask(task) });
  } catch (error: any) {
    return taskJson({ error: error?.message ?? "Failed to create task" });
  }
}
