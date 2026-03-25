import cron, { ScheduledTask } from "node-cron";
import { SCHEDULER_CONSTANTS } from "@/lib/constants";
import db from "@/lib/db";
import { runAutomation } from "@/lib/scraper";
import { debugLog, debugError } from "@/lib/debug";

let scheduledTask: ScheduledTask | null = null;

async function runDueAutomations() {
  const now = new Date();
  debugLog("scheduler", `[Scheduler] Checking for due automations at ${now.toISOString()}`);

  try {
    const dueAutomations = await db.automation.findMany({
      where: {
        status: "active",
        nextRunAt: { lte: now },
      },
      include: {
        resume: true,
      },
    });

    if (dueAutomations.length === 0) {
      debugLog("scheduler", "[Scheduler] No automations due to run");
      return;
    }

    debugLog("scheduler", `[Scheduler] Found ${dueAutomations.length} automation(s) to run`);

    for (const automation of dueAutomations) {
      if (!automation.resume) {
        debugLog("scheduler", `[Scheduler] Skipping automation ${automation.id} - no resume`);
        await db.automationRun.create({
          data: {
            automationId: automation.id,
            status: "failed",
            errorMessage: "resume_missing",
            completedAt: new Date(),
          },
        });
        continue;
      }

      try {
        debugLog("scheduler", `[Scheduler] Running automation: ${automation.name}`);
        const result = await runAutomation({
          id: automation.id,
          userId: automation.userId,
          name: automation.name,
          jobBoard: automation.jobBoard as "jsearch" | "eures",
          keywords: automation.keywords,
          location: automation.location,
          connectorParams: automation.connectorParams ?? undefined,
          resumeId: automation.resumeId,
          matchThreshold: automation.matchThreshold,
          scheduleHour: automation.scheduleHour,
          nextRunAt: automation.nextRunAt,
          lastRunAt: automation.lastRunAt,
          status: automation.status as "active" | "paused",
          createdAt: automation.createdAt,
          updatedAt: automation.updatedAt,
        });
        debugLog("scheduler", `[Scheduler] Automation ${automation.name} completed: ${result.status}, saved ${result.jobsSaved} jobs`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        debugError("scheduler", `[Scheduler] Automation ${automation.name} failed:`, message);
      }
    }
  } catch (error) {
    debugError("scheduler", "[Scheduler] Error running due automations:", error);
  }
}

export function startScheduler() {
  if (!SCHEDULER_CONSTANTS.ENABLED) {
    debugLog("scheduler", "[Scheduler] Disabled via SCHEDULER_CONSTANTS.ENABLED");
    return;
  }

  if (scheduledTask) {
    debugLog("scheduler", "[Scheduler] Already running");
    return;
  }

  const cronExpression = SCHEDULER_CONSTANTS.CRON_EXPRESSION;

  if (!cron.validate(cronExpression)) {
    debugError("scheduler", `[Scheduler] Invalid cron expression: ${cronExpression}`);
    return;
  }

  debugLog("scheduler", `[Scheduler] Starting with schedule: ${cronExpression}`);

  scheduledTask = cron.schedule(cronExpression, runDueAutomations, {
    timezone: process.env.TZ || "UTC",
  });

  debugLog("scheduler", "[Scheduler] Started successfully");
}

export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    debugLog("scheduler", "[Scheduler] Stopped");
  }
}

export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}
