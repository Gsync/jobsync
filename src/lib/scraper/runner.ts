import db from "@/lib/db";
import type { Automation } from "@/models/automation.model";
import { ATS_PROVIDERS } from "./ats/registry";
import { AiProvider } from "@/models/ai.model";
import { automationLogger } from "@/lib/automation-logger";
import { PROVIDER_VERIFIERS } from "@/lib/ai/provider-registry.server";
import { getOllamaBaseUrl } from "@/actions/apiKey.actions";
import { log, withSpan } from "@/lib/telemetry";
import type { ResumeWithSections, RunnerResult } from "./automation-run/types";
import { getUserAiSettings } from "./automation-run/aiSettings";
import { finalizeRun } from "./automation-run/finalize";
import { runAtsRun } from "./automation-run/atsRun";

export { getUserAiSettings };
export type { RunnerResult };

// Thrown by runAutomation's atomic claim when another run is already active
// for this automation. Callers (scheduler, manual-run route) already do their
// own pre-check for a fast/clean skip, but that check-then-act isn't atomic on
// its own — two near-simultaneous callers can both pass it before either has
// written a "running" row. This error signals the loser of that race so it
// can skip instead of starting a duplicate run.
export class AutomationAlreadyRunningError extends Error {
  constructor(automationId: string) {
    super(`Automation ${automationId} already has an active run`);
    this.name = "AutomationAlreadyRunningError";
  }
}

// Wraps the work, not the trigger: the 03:00 scheduler and a manual run from
// the UI are two entry points into identical work, and instrumenting the
// trigger would export every manual run's scraper.match span parentless.
export async function runAutomation(
  automation: Automation,
  signal?: AbortSignal,
): Promise<RunnerResult> {
  return withSpan(
    "automation.run",
    {
      "jobsync.automation_id": automation.id,
      "jobsync.automation_name": automation.name,
      "jobsync.job_board": automation.jobBoard,
      "jobsync.user_id": automation.userId,
    },
    (span) =>
      runAutomationTraced(automation, signal).then((result) => {
        span.setAttrs({
          "jobsync.run.id": result.runId,
          "jobsync.run.status": result.status,
          "jobsync.run.jobs_searched": result.jobsSearched,
          "jobsync.run.jobs_deduplicated": result.jobsDeduplicated,
          "jobsync.run.jobs_processed": result.jobsProcessed,
          "jobsync.run.jobs_matched": result.jobsMatched,
          "jobsync.run.jobs_saved": result.jobsSaved,
        });
        return result;
      }),
  );
}

async function runAutomationTraced(
  automation: Automation,
  signal?: AbortSignal,
): Promise<RunnerResult> {
  // Atomic claim: a partial unique index (AutomationRun_automationId_active_key,
  // see migrations/20260710000001_automation_run_single_active) allows at most
  // one running/cancelling row per automation. A prior SELECT-then-INSERT
  // $transaction assumed SQLite serializes concurrent write transactions,
  // but deferred transactions don't take a write lock until the first write,
  // so two racing callers could both pass the SELECT before either INSERTed —
  // relying on the DB constraint instead closes that race for good.
  let run;
  try {
    run = await db.automationRun.create({
      data: {
        automationId: automation.id,
        status: "running",
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new AutomationAlreadyRunningError(automation.id);
    }
    throw error;
  }

  log.info("[Automation] Starting automation run", {
    "automation.id": automation.id,
    "automation.name": automation.name,
  });
  automationLogger.startRun(automation.id);
  log.info("[Automation] Created run", {
    "automation.id": automation.id,
    "run.id": run.id,
  });
  automationLogger.log(
    automation.id,
    "info",
    `Created automation run with ID: ${run.id}`,
  );

  // Abort the run from two sources: the request connection dropping, and a
  // user cancel flag (polled). The cancel flag lives on automationLogger — the
  // same shared singleton the SSE reads — so it is reliably visible here even
  // though the cancel request arrives on a different route. Aborting the
  // controller propagates into the in-flight LLM call (abortSignal).
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onParentAbort);
  }
  let dbCancelCheckInFlight = false;
  const cancelPoll = setInterval(() => {
    if (controller.signal.aborted) return;

    // Fast path: in-memory flag (only works when /cancel shares this process).
    if (automationLogger.isCancelRequested(automation.id)) {
      controller.abort();
      return;
    }

    // Reliable path: the /cancel route flips the run row to "cancelling". This
    // survives module/process boundaries where the in-memory flag does not.
    if (dbCancelCheckInFlight) return;
    dbCancelCheckInFlight = true;
    db.automationRun
      .findUnique({ where: { id: run.id }, select: { status: true } })
      .then((row) => {
        if (row?.status === "cancelling") controller.abort();
      })
      .catch(() => {})
      .finally(() => {
        dbCancelCheckInFlight = false;
      });
  }, 500);
  const effectiveSignal = controller.signal;

  try {
    // Checked here (not just in the manual /run route) so scheduled/cron
    // runs also fail fast instead of silently completing with 0 matches.
    const aiSettings = await getUserAiSettings(automation.userId);
    if (aiSettings.provider === AiProvider.OLLAMA) {
      const ollamaCheck = await PROVIDER_VERIFIERS.ollama(
        await getOllamaBaseUrl(automation.userId),
      );
      if (!ollamaCheck.success) {
        const message =
          ollamaCheck.error ||
          "Ollama is not available. Please make sure Ollama is running.";
        automationLogger.log(automation.id, "error", message);
        automationLogger.endRun(automation.id);

        return await finalizeRun(run.id, {
          status: "failed",
          errorMessage: message,
          jobsSearched: 0,
          jobsDeduplicated: 0,
          jobsProcessed: 0,
          jobsMatched: 0,
          jobsSaved: 0,
        });
      }
    }

    automationLogger.log(automation.id, "info", "Fetching resume data...");

    const resume = await db.resume.findUnique({
      where: { id: automation.resumeId },
      include: {
        ContactInfo: true,
        ResumeSections: {
          include: {
            summary: true,
            workExperiences: {
              include: {
                Company: true,
                jobTitle: true,
                location: true,
              },
            },
            educations: {
              include: {
                location: true,
              },
            },
            licenseOrCertifications: true,
            skills: { include: { Tag: true } },
          },
        },
      },
    });

    if (!resume) {
      automationLogger.log(
        automation.id,
        "error",
        "Resume not found or missing",
      );
      automationLogger.endRun(automation.id);

      return await finalizeRun(run.id, {
        status: "failed",
        errorMessage: "resume_missing",
        jobsSearched: 0,
        jobsDeduplicated: 0,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    automationLogger.log(
      automation.id,
      "success",
      `Resume loaded: ${resume.title}`,
    );

    const atsProvider = ATS_PROVIDERS[automation.jobBoard];
    if (!atsProvider) {
      // A retired board (jsearch) left on an existing row. The scheduler
      // filters these out; this covers a direct or manual invocation.
      const message = `Job board "${automation.jobBoard}" has been removed - delete this automation`;
      automationLogger.log(automation.id, "error", message);
      automationLogger.endRun(automation.id);

      return await finalizeRun(run.id, {
        status: "blocked",
        blockedReason: "source_removed",
        jobsSearched: 0,
        jobsDeduplicated: 0,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    return await runAtsRun(
      automation,
      atsProvider,
      run.id,
      resume as ResumeWithSections,
      effectiveSignal,
    );
  } catch (error) {
    // An abort surfaces here as an AbortError; finalize as cancelled, not failed.
    if (effectiveSignal.aborted || (error instanceof Error && error.name === "AbortError")) {
      automationLogger.log(automation.id, "warning", "Run aborted by user");
      automationLogger.endRun(automation.id);
      return await finalizeRun(run.id, {
        status: "cancelled",
        jobsSearched: 0,
        jobsDeduplicated: 0,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    automationLogger.log(
      automation.id,
      "error",
      `Automation run failed: ${message}`,
    );
    automationLogger.endRun(automation.id);

    log.error("[Automation] Run failed", {
      "automation.id": automation.id,
      "run.id": run.id,
      error: message,
    });
    return await finalizeRun(run.id, {
      status: "failed",
      errorMessage: message,
      jobsSearched: 0,
      jobsDeduplicated: 0,
      jobsProcessed: 0,
      jobsMatched: 0,
      jobsSaved: 0,
    });
  } finally {
    clearInterval(cancelPoll);
    if (signal) signal.removeEventListener("abort", onParentAbort);
  }
}
