"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { calculateNextRunAt } from "@/lib/scraper/schedule";
import {
  CreateAutomationSchema,
  UpdateAutomationSchema,
  type CreateAutomationInput,
  type UpdateAutomationInput,
} from "@/models/automation.schema";
import type {
  AutomationWithResume,
  AutomationRun,
  DiscoveredJob,
  DiscoveryStatus,
} from "@/models/automation.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { syncSchedulerState } from "@/lib/scheduler";
import { generateText } from "ai";
import {
  getModel,
  parseJobMatch,
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchPrompt,
  preprocessResume,
  preprocessJob,
} from "@/lib/ai";
import { getResumeById } from "@/actions/profile.actions";
import { getJobDetails } from "@/actions/job.actions";
import { defaultUserSettings } from "@/models/userSettings.model";
import { automationLogger } from "@/lib/automation-logger";


function formatError(error: unknown, fallback: string): { success: false; message: string } {
  console.error(error, fallback);
  if (error instanceof Error) {
    return { success: false, message: error.message || fallback };
  }
  return { success: false, message: fallback };
}

export async function getAutomationsList(
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE
): Promise<{
  success: boolean;
  data?: AutomationWithResume[];
  total?: number;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const skip = (page - 1) * limit;

    const [automations, total] = await Promise.all([
      db.automation.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          resume: {
            select: { id: true, title: true },
          },
        },
      }),
      db.automation.count({ where: { userId: user.id } }),
    ]);

    return {
      success: true,
      data: automations as unknown as AutomationWithResume[],
      total,
    };
  } catch (error) {
    return formatError(error, "Failed to get automations list");
  }
}

export async function getAutomationById(id: string): Promise<{
  success: boolean;
  data?: AutomationWithResume & { runs: AutomationRun[] };
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
      include: {
        resume: {
          select: { id: true, title: true },
        },
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    return {
      success: true,
      data: automation as unknown as AutomationWithResume & { runs: AutomationRun[] },
    };
  } catch (error) {
    return formatError(error, "Failed to get automation");
  }
}

export async function createAutomation(
  input: CreateAutomationInput
): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const validated = CreateAutomationSchema.parse(input);

    const count = await db.automation.count({ where: { userId: user.id } });
    if (count >= APP_CONSTANTS.MAX_AUTOMATIONS_PER_USER) {
      return { success: false, message: `Maximum of ${APP_CONSTANTS.MAX_AUTOMATIONS_PER_USER} automations allowed per user` };
    }

    const resume = await db.resume.findFirst({
      where: {
        id: validated.resumeId,
        profile: { userId: user.id },
      },
    });

    if (!resume) {
      return { success: false, message: "Resume not found or doesn't belong to you" };
    }

    const nextRunAt = calculateNextRunAt(validated.scheduleHour);

    const automation = await db.automation.create({
      data: {
        userId: user.id,
        name: validated.name,
        jobBoard: validated.jobBoard,
        keywords: validated.keywords ?? "",
        location: validated.location ?? "",
        sourceConfig: validated.sourceConfig
          ? JSON.stringify(validated.sourceConfig)
          : null,
        resumeId: validated.resumeId,
        matchThreshold: validated.matchThreshold,
        scheduleHour: validated.scheduleHour,
        nextRunAt,
        status: "active",
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: automation as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to create automation");
  }
}

export async function updateAutomation(
  id: string,
  input: UpdateAutomationInput
): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const validated = UpdateAutomationSchema.parse(input);

    const existing = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, message: "Automation not found" };
    }

    if (validated.resumeId) {
      const resume = await db.resume.findFirst({
        where: {
          id: validated.resumeId,
          profile: { userId: user.id },
        },
      });
      if (!resume) {
        return { success: false, message: "Resume not found or doesn't belong to you" };
      }
    }

    const updateData: Record<string, unknown> = { ...validated };

    // sourceConfig is a parsed object in the validated input; the column is a
    // JSON string. Coalesce the legacy columns for greenhouse automations.
    if (validated.sourceConfig !== undefined) {
      updateData.sourceConfig = JSON.stringify(validated.sourceConfig);
    }
    if (validated.jobBoard === "greenhouse") {
      updateData.keywords = validated.keywords ?? "";
      updateData.location = validated.location ?? "";
    }

    if (validated.scheduleHour !== undefined) {
      updateData.nextRunAt = calculateNextRunAt(validated.scheduleHour);
    }

    const automation = await db.automation.update({
      where: { id },
      data: updateData,
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    return {
      success: true,
      data: automation as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to update automation");
  }
}

export async function deleteAutomation(id: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    await db.automation.delete({ where: { id } });

    await syncSchedulerState();

    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to delete automation");
  }
}

export async function pauseAutomation(id: string): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    const updated = await db.automation.update({
      where: { id },
      data: {
        status: "paused",
        nextRunAt: null,
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: updated as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to pause automation");
  }
}

export async function resumeAutomation(id: string): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    const nextRunAt = calculateNextRunAt(automation.scheduleHour);

    const updated = await db.automation.update({
      where: { id },
      data: {
        status: "active",
        nextRunAt,
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: updated as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to resume automation");
  }
}

export async function getDiscoveredJobs(options?: {
  automationId?: string;
  discoveryStatus?: DiscoveryStatus;
  page?: number;
  limit?: number;
  sortBy?: "matchScore" | "discoveredAt";
  sortOrder?: "asc" | "desc";
}): Promise<{
  success: boolean;
  data?: DiscoveredJob[];
  total?: number;
  statusCounts?: { new: number; dismissed: number; accepted: number };
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const {
      automationId,
      discoveryStatus,
      page = 1,
      limit = APP_CONSTANTS.RECORDS_PER_PAGE,
      sortBy = "matchScore",
      sortOrder = "desc",
    } = options || {};

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      userId: user.id,
      automationId: { not: null },
    };

    if (automationId) {
      where.automationId = automationId;
    }

    if (discoveryStatus) {
      where.discoveryStatus = discoveryStatus;
    }

    // Status counts ignore the discoveryStatus filter so callers get the full
    // per-status breakdown for the whole automation, not just the current page.
    const { discoveryStatus: _omit, ...countWhere } = where;

    const [jobs, total, grouped] = await Promise.all([
      db.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          automation: {
            select: { id: true, name: true },
          },
          JobTitle: { select: { label: true } },
          Company: { select: { label: true } },
          Location: { select: { label: true } },
        },
      }),
      db.job.count({ where }),
      db.job.groupBy({
        by: ["discoveryStatus"],
        where: countWhere,
        _count: true,
      }),
    ]);

    const statusCounts = { new: 0, dismissed: 0, accepted: 0 };
    for (const g of grouped) {
      if (g.discoveryStatus && g.discoveryStatus in statusCounts) {
        statusCounts[g.discoveryStatus as keyof typeof statusCounts] =
          g._count;
      }
    }

    return {
      success: true,
      data: jobs as unknown as DiscoveredJob[],
      total,
      statusCounts,
    };
  } catch (error) {
    return formatError(error, "Failed to get discovered jobs");
  }
}

export async function getDiscoveredJobById(id: string): Promise<{
  success: boolean;
  data?: DiscoveredJob & { parsedMatchData: object | null };
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const job = await db.job.findFirst({
      where: {
        id,
        userId: user.id,
        automationId: { not: null },
      },
      include: {
        automation: {
          select: { id: true, name: true },
        },
        JobTitle: { select: { label: true } },
        Company: { select: { label: true } },
        Location: { select: { label: true } },
      },
    });

    if (!job) {
      return { success: false, message: "Discovered job not found" };
    }

    let parsedMatchData = null;
    if (job.matchData) {
      try {
        parsedMatchData = JSON.parse(job.matchData);
      } catch {
        // Ignore parse errors
      }
    }

    return {
      success: true,
      data: {
        ...(job as unknown as DiscoveredJob),
        parsedMatchData,
      },
    };
  } catch (error) {
    return formatError(error, "Failed to get discovered job");
  }
}

export async function dismissDiscoveredJob(id: string): Promise<{
  success: boolean;
  data?: DiscoveredJob;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const job = await db.job.findFirst({
      where: {
        id,
        userId: user.id,
        automationId: { not: null },
      },
    });

    if (!job) {
      return { success: false, message: "Discovered job not found" };
    }

    const updated = await db.job.update({
      where: { id },
      data: { discoveryStatus: "dismissed" },
      include: {
        automation: {
          select: { id: true, name: true },
        },
        JobTitle: { select: { label: true } },
        Company: { select: { label: true } },
        Location: { select: { label: true } },
      },
    });

    return {
      success: true,
      data: updated as unknown as DiscoveredJob,
    };
  } catch (error) {
    return formatError(error, "Failed to dismiss discovered job");
  }
}

// Bulk-deletes discovered jobs for one automation. Always keeps accepted jobs
// (they're tracked) and deletes dismissed ones; includeNew also clears the
// unreviewed "new" pile.
export async function clearDiscoveredJobs(options: {
  automationId: string;
  includeNew?: boolean;
}): Promise<{ success: boolean; deleted?: number; message?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const { automationId, includeNew = false } = options;
    const statuses: DiscoveryStatus[] = includeNew
      ? ["dismissed", "new"]
      : ["dismissed"];

    const result = await db.job.deleteMany({
      where: {
        userId: user.id,
        automationId,
        discoveryStatus: { in: statuses },
      },
    });

    return { success: true, deleted: result.count };
  } catch (error) {
    return formatError(error, "Failed to clear discovered jobs");
  }
}

export async function acceptDiscoveredJob(id: string): Promise<{
  success: boolean;
  data?: DiscoveredJob;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const job = await db.job.findFirst({
      where: {
        id,
        userId: user.id,
        automationId: { not: null },
      },
    });

    if (!job) {
      return { success: false, message: "Discovered job not found" };
    }

    const updated = await db.job.update({
      where: { id },
      data: { discoveryStatus: "accepted" },
      include: {
        automation: {
          select: { id: true, name: true },
        },
        JobTitle: { select: { label: true } },
        Company: { select: { label: true } },
        Location: { select: { label: true } },
      },
    });

    return {
      success: true,
      data: updated as unknown as DiscoveredJob,
    };
  } catch (error) {
    return formatError(error, "Failed to accept discovered job");
  }
}

// Runs an on-demand LLM match for an un-analyzed discovered job using the
// resume tied to its automation and the user's AI settings (no model picker —
// mirrors the automation runner). Upgrades matchData with analyzed: true.
export async function analyzeDiscoveredJob(jobId: string): Promise<{
  success: boolean;
  matchScore?: number;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const job = await db.job.findFirst({
      where: { id: jobId, userId: user.id, automationId: { not: null } },
      include: { automation: { select: { resumeId: true } } },
    });

    if (!job) {
      return { success: false, message: "Discovered job not found" };
    }

    if (job.automationId && automationLogger.isRunning(job.automationId)) {
      return {
        success: false,
        message:
          "A run is in progress for this automation. Please wait until it completes before analyzing jobs.",
      };
    }

    const resumeId = job.automation?.resumeId;
    if (!resumeId) {
      return { success: false, message: "Automation resume is missing" };
    }

    const userSettings = await db.userSettings.findUnique({
      where: { userId: user.id },
    });
    const ai = userSettings
      ? {
          ...defaultUserSettings.ai,
          ...(JSON.parse(userSettings.settings).ai ?? {}),
        }
      : defaultUserSettings.ai;

    const [{ data: resume }, { job: jobDetails }] = await Promise.all([
      getResumeById(resumeId),
      getJobDetails(jobId),
    ]);

    const [resumePre, jobPre] = await Promise.all([
      preprocessResume(resume),
      preprocessJob(jobDetails),
    ]);

    if (!resumePre.success || !jobPre.success) {
      return { success: false, message: "Failed to prepare match inputs" };
    }

    const model = await getModel(ai.provider, ai.model || "llama3.2", user.id);

    const result = await generateText({
      model,
      system: JOB_MATCH_SYSTEM_PROMPT,
      prompt: buildJobMatchPrompt(
        resumePre.data.normalizedText,
        jobPre.data.normalizedText,
      ),
      temperature: 0.3,
    });

    const { scores, body } = parseJobMatch(result.text);
    if (!scores) {
      return { success: false, message: "AI did not return a match score" };
    }

    let previous: Record<string, unknown> = {};
    try {
      previous = JSON.parse(job.matchData ?? "{}");
    } catch {
      previous = {};
    }

    const matchData = JSON.stringify({
      ...previous,
      matchScore: scores.matchScore,
      recommendation: scores.recommendation,
      body,
      resumeId,
      resumeTitle: resume.title,
      matchedAt: new Date().toISOString(),
      provider: ai.provider,
      model: ai.model,
      analyzed: true,
    });

    await db.job.update({
      where: { id: jobId, userId: user.id },
      data: { matchScore: scores.matchScore, matchData },
    });

    return { success: true, matchScore: scores.matchScore };
  } catch (error) {
    return formatError(error, "Failed to analyze discovered job");
  }
}

export async function getAutomationRuns(
  automationId: string,
  options?: {
    page?: number;
    limit?: number;
  }
): Promise<{
  success: boolean;
  data?: AutomationRun[];
  total?: number;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

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
        orderBy: { startedAt: "desc" },
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
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Not authenticated" };

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
