"use server";

import db from "@/lib/db";
import { requireUser } from "../shared";
import type {
  DiscoveredJob,
  DiscoveryStatus,
} from "@/models/automation.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { formatError } from "./shared";

export async function getDiscoveredJobs(options?: {
  automationId?: string;
  discoveryStatus?: DiscoveryStatus | DiscoveryStatus[];
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
    const user = await requireUser();

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
      where.discoveryStatus = Array.isArray(discoveryStatus)
        ? { in: discoveryStatus }
        : discoveryStatus;
    }

    // Status counts ignore the discoveryStatus filter so callers get the full
    // per-status breakdown for the whole automation, not just the current page.
    const { discoveryStatus: _omit, ...countWhere } = where;

    const [jobs, total, grouped] = await Promise.all([
      db.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }],
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
        statusCounts[g.discoveryStatus as keyof typeof statusCounts] = g._count;
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
    const user = await requireUser();

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

async function setDiscoveredJobStatus(
  id: string,
  status: "accepted" | "dismissed",
): Promise<{
  success: boolean;
  data?: DiscoveredJob;
  message?: string;
}> {
  try {
    const user = await requireUser();

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
      data: { discoveryStatus: status },
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
    return formatError(
      error,
      `Failed to ${status === "accepted" ? "accept" : "dismiss"} discovered job`,
    );
  }
}

export async function dismissDiscoveredJob(id: string): Promise<{
  success: boolean;
  data?: DiscoveredJob;
  message?: string;
}> {
  return setDiscoveredJobStatus(id, "dismissed");
}

// Bulk-deletes discovered jobs for one automation. Always keeps accepted jobs
// (they're tracked) and deletes dismissed ones; includeNew also clears the
// unreviewed "new" pile.
export async function clearDiscoveredJobs(options: {
  automationId: string;
  includeNew?: boolean;
}): Promise<{ success: boolean; deleted?: number; message?: string }> {
  try {
    const user = await requireUser();

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
  return setDiscoveredJobStatus(id, "accepted");
}
