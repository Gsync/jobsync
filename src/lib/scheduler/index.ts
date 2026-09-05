import cron, { ScheduledTask } from "node-cron";
import { SCHEDULER_CONSTANTS } from "@/lib/constants";
import db from "@/lib/db";
import { runAutomation, AutomationAlreadyRunningError } from "@/lib/scraper";
import { ATS_BOARDS, type JobBoard } from "@/models/automation.model";
import { log } from "@/lib/telemetry";

let scheduledTask: ScheduledTask | null = null;

async function runDueAutomations() {
  const now = new Date();
  log.info("[Scheduler] Checking for due automations", {
    "scheduler.checked_at": now.toISOString(),
  });

  try {
    const dueAutomations = await db.automation.findMany({
      where: {
        status: "active",
        nextRunAt: { lte: now },
        // Rows left on a retired board never fire; the UI offers only delete.
        jobBoard: { in: ATS_BOARDS },
      },
      include: {
        resume: true,
      },
    });

    if (dueAutomations.length === 0) {
      log.info("[Scheduler] No automations due to run");
      return;
    }

    log.info("[Scheduler] Found automations to run", {
      "scheduler.due_count": dueAutomations.length,
    });

    for (const automation of dueAutomations) {
      if (!automation.resume) {
        log.info("[Scheduler] Skipping automation - no resume", {
          "automation.id": automation.id,
          "automation.name": automation.name,
        });
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

      // Skip if a run (manual or scheduled) is already in flight for this
      // automation. Logger/cancel state is keyed by automationId, so overlapping
      // runs would clobber each other.
      const activeRun = await db.automationRun.findFirst({
        where: {
          automationId: automation.id,
          status: { in: ["running", "cancelling"] },
        },
        select: { id: true },
      });
      if (activeRun) {
        log.info("[Scheduler] Skipping automation - run already in progress", {
          "automation.id": automation.id,
          "automation.name": automation.name,
        });
        continue;
      }

      try {
        log.info("[Scheduler] Running automation", {
          "automation.id": automation.id,
          "automation.name": automation.name,
        });
        const result = await runAutomation({
          id: automation.id,
          userId: automation.userId,
          name: automation.name,
          jobBoard: automation.jobBoard as JobBoard,
          keywords: automation.keywords,
          location: automation.location,
          sourceConfig: automation.sourceConfig,
          resumeId: automation.resumeId,
          matchThreshold: automation.matchThreshold,
          scheduleHour: automation.scheduleHour,
          nextRunAt: automation.nextRunAt,
          lastRunAt: automation.lastRunAt,
          status: automation.status as "active" | "paused",
          createdAt: automation.createdAt,
          updatedAt: automation.updatedAt,
        });
        log.info("[Scheduler] Automation completed", {
          "automation.id": automation.id,
          "automation.name": automation.name,
          "run.status": result.status,
          "run.jobs_saved": result.jobsSaved,
        });
      } catch (error) {
        if (error instanceof AutomationAlreadyRunningError) {
          log.info("[Scheduler] Skipping automation - run already in progress", {
            "automation.id": automation.id,
            "automation.name": automation.name,
          });
          continue;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        log.error("[Scheduler] Automation failed", {
          "automation.id": automation.id,
          "automation.name": automation.name,
          error: message,
        });
      }
    }
  } catch (error) {
    log.error("[Scheduler] Error running due automations", {
      error: String(error),
    });
  }
}

export function startScheduler() {
  if (!SCHEDULER_CONSTANTS.ENABLED) {
    log.info("[Scheduler] Disabled via SCHEDULER_CONSTANTS.ENABLED");
    return;
  }

  if (scheduledTask) {
    log.info("[Scheduler] Already running");
    return;
  }

  const cronExpression = SCHEDULER_CONSTANTS.CRON_EXPRESSION;

  if (!cron.validate(cronExpression)) {
    log.error("[Scheduler] Invalid cron expression", {
      "scheduler.cron": cronExpression,
    });
    return;
  }

  log.info("[Scheduler] Starting", { "scheduler.cron": cronExpression });

  scheduledTask = cron.schedule(cronExpression, runDueAutomations, {
    timezone: process.env.TZ || "UTC",
  });

  log.info("[Scheduler] Started successfully");
}

export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    log.info("[Scheduler] Stopped");
  }
}

export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}

// Marks any run stuck in "running" past the stale cutoff as failed. A hard kill
// mid-run (deploy/OOM/crash) leaves the run row in "running" forever otherwise.
export async function reapStaleRuns(): Promise<number> {
  const cutoff = new Date(Date.now() - SCHEDULER_CONSTANTS.STALE_RUN_TIMEOUT_MS);
  try {
    const result = await db.automationRun.updateMany({
      where: { status: "running", startedAt: { lt: cutoff } },
      data: {
        status: "failed",
        errorMessage: "interrupted",
        completedAt: new Date(),
      },
    });
    if (result.count > 0) {
      log.info("[Scheduler] Reaped stale running runs", {
        "scheduler.reaped_count": result.count,
      });
    }
    return result.count;
  } catch (error) {
    log.error("[Scheduler] Failed to reap stale runs", {
      error: String(error),
    });
    return 0;
  }
}

// Starts or stops the scheduler based on whether active automations exist
export async function syncSchedulerState() {
  await reapStaleRuns();
  const activeCount = await db.automation.count({ where: { status: "active" } });
  if (activeCount > 0) {
    startScheduler();
  } else {
    stopScheduler();
  }
}
