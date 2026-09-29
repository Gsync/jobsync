import db from "@/lib/db";
import { log } from "@/lib/telemetry";
import { AI_USAGE_CONSTANTS } from "@/lib/constants";

export function aiUsageCutoff(now: Date = new Date()): Date {
  return new Date(
    now.getTime() - AI_USAGE_CONSTANTS.RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export async function pruneAiCalls(now: Date = new Date()): Promise<number> {
  try {
    const { count } = await db.aiCall.deleteMany({
      where: { startedAt: { lt: aiUsageCutoff(now) } },
    });
    if (count > 0) log.info("[AiUsage] Pruned", { "ai_usage.pruned": count });
    return count;
  } catch (error) {
    log.error("[AiUsage] Prune failed", { error: String(error) });
    return 0;
  }
}
