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

const MAX_AUTOMATIONS_PER_USER = 10;

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
    if (count >= MAX_AUTOMATIONS_PER_USER) {
      return { success: false, message: `Maximum of ${MAX_AUTOMATIONS_PER_USER} automations allowed per user` };
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
        keywords: validated.keywords,
        location: validated.location,
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

    const [jobs, total] = await Promise.all([
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
    ]);

    return {
      success: true,
      data: jobs as unknown as DiscoveredJob[],
      total,
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
