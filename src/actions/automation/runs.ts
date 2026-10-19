"use server";

import db from "@/lib/db";
import { requireUser } from "../shared";
import type { AutomationRun } from "@/models/automation.model";
import { automationLogger } from "@/lib/automation-logger";
import { formatError } from "./shared";

export async function getAutomationRuns(
  automationId: string,
  options?: {
    page?: number;
    limit?: number;
  },
): Promise<{
  success: boolean;
  data?: AutomationRun[];
  total?: number;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const { page = 1, limit = 10 } = options || {};
    const skip = (page - 1) * limit;

    const automation = await db.automation.findFirst({
      where: { id: automationId, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    const [runs, total] = await Promise.all([
      db.automationRun.findMany({
        where: { automationId },
        skip,
        take: limit,
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      }),
      db.automationRun.count({ where: { automationId } }),
    ]);

    return {
      success: true,
      data: runs as unknown as AutomationRun[],
      total,
    };
  } catch (error) {
    return formatError(error, "Failed to get automation runs");
  }
}

export async function deleteAutomationRun(
  runId: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const user = await requireUser();

    // Ownership check via automation -> userId
    const run = await db.automationRun.findFirst({
      where: { id: runId, automation: { userId: user.id } },
    });

    if (!run) return { success: false, message: "Run not found" };

    await db.automationRun.delete({ where: { id: runId } });

    // Clear this automation's in-memory logs alongside the run history, unless a
    // run is currently in flight (whose live logs we must not wipe).
    if (!automationLogger.isRunning(run.automationId)) {
      automationLogger.clearLogs(run.automationId);
    }

    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to delete run");
  }
}
