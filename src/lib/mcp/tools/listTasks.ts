import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { serializeTask, taskJson } from "@/lib/mcp/tools/taskResult";
import { listTasksForUser } from "@/lib/tasks/queries";
import type { McpListTasksInput } from "@/models/mcp.schema";

export async function handleListTasks(input: McpListTasksInput, userId: string) {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    return taskJson({
      error: "rate_limit_exceeded",
      retryAfterSeconds: Math.ceil(rateCheck.resetIn / 1000),
    });
  }

  try {
    const { data, total } = await listTasksForUser(userId, {
      page: input.page,
      limit: input.limit,
      statuses: input.statuses,
      search: input.search,
      activityTypeLabel: input.activityType,
    });

    return taskJson({
      tasks: data.map(serializeTask),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
        hasMore: input.page * input.limit < total,
      },
    });
  } catch (error: any) {
    return taskJson({ error: error?.message ?? "Failed to list tasks" });
  }
}
