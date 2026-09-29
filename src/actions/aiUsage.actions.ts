"use server";

import db from "@/lib/db";
import { requireUser } from "./shared";
import { handleError } from "@/lib/utils";
import { AI_USAGE_CONSTANTS } from "@/lib/constants";
import { aiUsageCutoff } from "@/lib/aiUsage/prune";
import { summarizeAiUsage } from "@/lib/aiUsage/summarize";
import type {
  AiCallRow,
  AiCallStatus,
  AiUsageFeature,
  AiUsageRange,
  AiUsageSummary,
} from "@/models/aiUsage.model";

const DAY_MS = 24 * 60 * 60 * 1000;

function validTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

// since is the viewer's local midnight rangeDays - 1 days ago, computed on the
// client because only the client knows its calendar.
export async function getAiUsage(input: {
  rangeDays: AiUsageRange;
  since: Date;
  timeZone: string;
}): Promise<
  | { success: true; data: AiUsageSummary }
  | { success: false; message: string }
> {
  try {
    const user = await requireUser();
    if (input.rangeDays !== 7 && input.rangeDays !== 30) {
      return { success: false, message: "Invalid range" };
    }
    const now = new Date();
    const timeZone = validTimeZone(input.timeZone);
    // A day of slack covers the viewer's offset from UTC.
    const earliest = new Date(now.getTime() - (input.rangeDays + 1) * DAY_MS);
    const since = new Date(
      Math.max(new Date(input.since).getTime(), earliest.getTime()),
    );
    const previousSince = new Date(since.getTime() - input.rangeDays * DAY_MS);

    const [rows, previousCalls, recent] = await Promise.all([
      db.aiCall.findMany({
        where: { userId: user.id, startedAt: { gte: since } },
        select: {
          startedAt: true,
          feature: true,
          provider: true,
          model: true,
          status: true,
          inputTokens: true,
          outputTokens: true,
          durationMs: true,
          firstTokenMs: true,
          numCtx: true,
        },
      }),
      db.aiCall.count({
        where: {
          userId: user.id,
          startedAt: { gte: previousSince, lt: since },
        },
      }),
      db.aiCall.findMany({
        where: { userId: user.id, startedAt: { gte: aiUsageCutoff(now) } },
        orderBy: { startedAt: "desc" },
        take: AI_USAGE_CONSTANTS.RECENT_LIMIT,
        select: {
          id: true,
          startedAt: true,
          feature: true,
          provider: true,
          model: true,
          status: true,
          inputTokens: true,
          outputTokens: true,
          durationMs: true,
          firstTokenMs: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        ...summarizeAiUsage(rows, {
          rangeDays: input.rangeDays,
          since,
          timeZone,
          previousCalls,
        }),
        recent: recent.map((r) => ({
          ...r,
          feature: r.feature as AiUsageFeature,
          status: r.status as AiCallStatus,
        })) satisfies AiCallRow[],
      },
    };
  } catch (error) {
    // handleError types success as boolean; re-wrap to keep the union narrow.
    const { message } = handleError(error, "Failed to load AI usage.");
    return { success: false, message };
  }
}
