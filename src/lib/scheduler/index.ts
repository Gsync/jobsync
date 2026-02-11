import cron, { ScheduledTask } from "node-cron";
import { SCHEDULER_CONSTANTS } from "@/lib/constants";
import db from "@/lib/db";
import { runAutomation } from "@/lib/scraper";

let scheduledTask: ScheduledTask | null = null;

async function runDueAutomations() {
  const now = new Date();
  console.log(`[Scheduler] Checking for due automations at ${now.toISOString()}`);

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
      console.log("[Scheduler] No automations due to run");
      return;
    }

    console.log(`[Scheduler] Found ${dueAutomations.length} automation(s) to run`);

    for (const automation of dueAutomations) {
      if (!automation.resume) {
        console.log(`[Scheduler] Skipping automation ${automation.id} - no resume`);
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
        console.log(`[Scheduler] Running automation: ${automation.name}`);
        const result = await runAutomation({
          id: automation.id,
          userId: automation.userId,
          name: automation.name,
          jobBoard: automation.jobBoard as "jsearch",
          keywords: automation.keywords,
          location: automation.location,
          resumeId: automation.resumeId,
          matchThreshold: automation.matchThreshold,
          scheduleHour: automation.scheduleHour,
          nextRunAt: automation.nextRunAt,
          lastRunAt: automation.lastRunAt,
          status: automation.status as "active" | "paused",
          createdAt: automation.createdAt,
          updatedAt: automation.updatedAt,
        });
        console.log(`[Scheduler] Automation ${automation.name} completed: ${result.status}, saved ${result.jobsSaved} jobs`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Scheduler] Automation ${automation.name} failed:`, message);
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error running due automations:", error);
  }
}

export function startScheduler() {
  if (!SCHEDULER_CONSTANTS.ENABLED) {
    console.log("[Scheduler] Disabled via SCHEDULER_CONSTANTS.ENABLED");
    return;
  }

  if (scheduledTask) {
    console.log("[Scheduler] Already running");
    return;
  }

  const cronExpression = SCHEDULER_CONSTANTS.CRON_EXPRESSION;

  if (!cron.validate(cronExpression)) {
    console.error(`[Scheduler] Invalid cron expression: ${cronExpression}`);
    return;
  }

  console.log(`[Scheduler] Starting with schedule: ${cronExpression}`);

  scheduledTask = cron.schedule(cronExpression, runDueAutomations, {
    timezone: process.env.TZ || "UTC",
  });

  console.log("[Scheduler] Started successfully");
}

export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log("[Scheduler] Stopped");
  }
}

export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}
