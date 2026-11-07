"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getNotificationSummary } from "@/actions/notification.actions";
import { NOTIFICATION_CONSTANTS } from "@/lib/constants";
import type { NotificationSummary } from "@/models/notification.model";

interface NotificationContextValue {
  summary: NotificationSummary;
  refresh: () => Promise<void>;
}

const EMPTY: NotificationSummary = { unread: 0, unreadErrors: 0 };

const NotificationContext = createContext<NotificationContextValue>({
  summary: EMPTY,
  refresh: async () => {},
});

// Event-driven on purpose (no interval): runs finish about once a day.
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<NotificationSummary>(EMPTY);
  const pathname = usePathname();
  const lastFetch = useRef(0);

  const applySummary = useCallback(
    (res: Awaited<ReturnType<typeof getNotificationSummary>>) => {
      if (res.success && "data" in res) setSummary(res.data);
    },
    [],
  );

  const refresh = useCallback(async () => {
    lastFetch.current = Date.now();
    applySummary(await getNotificationSummary());
  }, [applySummary]);

  // Passive triggers (navigation, focus) skip if a fetch just ran.
  const refreshIfStale = useCallback(() => {
    if (Date.now() - lastFetch.current < NOTIFICATION_CONSTANTS.PASSIVE_REFRESH_THROTTLE_MS) return;
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshIfStale();
  }, [pathname, refreshIfStale]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };
    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshIfStale]);

  return (
    <NotificationContext.Provider value={{ summary, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
