import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { serializeTask, taskJson } from "@/lib/mcp/tools/taskResult";
import { completeTaskForUser } from "@/lib/tasks/mutations";
import type { McpCompleteTaskInput } from "@/models/mcp.schema";

export async function handleCompleteTask(
  input: McpCompleteTaskInput,
  userId: string,
) {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    return taskJson({
      error: "rate_limit_exceeded",
      retryAfterSeconds: Math.ceil(rateCheck.resetIn / 1000),
    });
  }

  try {
    const task = await completeTaskForUser(userId, input.taskId);
    return taskJson({ task: serializeTask(task) });
  } catch (error: any) {
    return taskJson({ error: error?.message ?? "Failed to complete task" });
  }
}
