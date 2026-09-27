"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";
import {
  dismissNotification,
  getPopoverNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notification.actions";
import type { NotificationItem } from "@/models/notification.model";
import { NotificationRow } from "./NotificationRow";
import { isErrorNotification } from "./notificationDisplay";

type PopoverTab = "all" | "errors" | "runs";

const TABS: { id: PopoverTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "errors", label: "Errors" },
  { id: "runs", label: "Runs" },
];

export function NotificationBell() {
  const { summary, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [tab, setTab] = useState<PopoverTab>("all");

  const load = async () => {
    const res = await getPopoverNotifications();
    if (res.success && "data" in res) setItems(res.data);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTab("all");
      load();
    }
  };

  const onRemove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await dismissNotification(id);
    refresh();
  };

  const onOpenLink = async (id: string) => {
    setOpen(false);
    await markNotificationRead(id);
    refresh();
  };

  const onMarkAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date() })));
    refresh();
  };

  // Unread only, like the bell badge: a read error needs no attention.
  const errorCount = items.filter(
    (i) => isErrorNotification(i) && i.readAt === null,
  ).length;
  const visible = items.filter((i) =>
    tab === "all" ? true : tab === "errors" ? isErrorNotification(i) : !isErrorNotification(i),
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {summary.unread > 0 && (
            <span
              data-testid="notification-badge"
              className={cn(
                "absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background px-1 text-[11px] font-semibold text-white",
                summary.unreadErrors > 0 ? "bg-destructive" : "bg-primary",
              )}
            >
              {summary.unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(408px,calc(100vw-2rem))] p-0">
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
          <h2 className="flex-grow text-[15px] font-semibold">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto gap-1 px-1 py-1.5 text-[13px] font-medium text-blue-400 hover:text-blue-300"
            onClick={onMarkAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>
        <div role="tablist" className="flex gap-1 border-b px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-[13px]",
                tab === t.id
                  ? "border-foreground font-semibold text-foreground"
                  : "border-transparent font-medium text-muted-foreground",
              )}
            >
              {t.label}
              {t.id === "errors" && errorCount > 0 && (
                <span className="rounded-full bg-red-950 px-1.5 text-[11px] font-semibold text-red-300">
                  {errorCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <ul className="flex max-h-[60vh] flex-col overflow-y-auto py-1">
          {visible.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              You’re all caught up.
            </li>
          ) : (
            visible.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                variant="popover"
                onRemove={onRemove}
                onOpenLink={onOpenLink}
              />
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-[13px]">
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
          >
            View all notifications
          </Link>
          <span className="text-muted-foreground">Kept 30 days</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
