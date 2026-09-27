"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getNotificationSummary } from "@/actions/notification.actions";
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

  const refresh = useCallback(async () => {
    const res = await getNotificationSummary();
    if (res.success && "data" in res) setSummary(res.data);
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ summary, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
