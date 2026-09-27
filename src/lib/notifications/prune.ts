import db from "@/lib/db";
import { log } from "@/lib/telemetry";
import { NOTIFICATION_CONSTANTS } from "@/lib/constants";

export function notificationCutoff(now: Date = new Date()): Date {
  return new Date(
    now.getTime() - NOTIFICATION_CONSTANTS.RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export async function pruneNotifications(now: Date = new Date()): Promise<number> {
  try {
    const { count } = await db.notification.deleteMany({
      where: { occurredAt: { lt: notificationCutoff(now) } },
    });
    if (count > 0) log.info("[Notifications] Pruned", { "notifications.pruned": count });
    return count;
  } catch (error) {
    log.error("[Notifications] Prune failed", { error: String(error) });
    return 0;
  }
}
