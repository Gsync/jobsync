import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { serializeTask, taskJson } from "@/lib/mcp/tools/taskResult";
import { getTaskForUser } from "@/lib/tasks/queries";
import type { McpGetTaskInput } from "@/models/mcp.schema";

export async function handleGetTask(input: McpGetTaskInput, userId: string) {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    return taskJson({
      error: "rate_limit_exceeded",
      retryAfterSeconds: Math.ceil(rateCheck.resetIn / 1000),
    });
  }

  try {
    const task = await getTaskForUser(userId, input.taskId);
    if (!task) return taskJson({ error: "task_not_found", taskId: input.taskId });

    return taskJson({ task: serializeTask(task) });
  } catch (error: any) {
    return taskJson({ error: error?.message ?? "Failed to get task" });
  }
}
