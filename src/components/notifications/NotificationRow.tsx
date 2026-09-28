"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/models/notification.model";
import {
  describeNotification,
  formatClock,
  formatShortAge,
  isErrorNotification,
} from "./notificationDisplay";

interface NotificationRowProps {
  item: NotificationItem;
  variant: "popover" | "page";
  onRemove: (id: string) => void;
  onOpenLink: (id: string) => void;
}

const ICONS = { run: CheckCircle2, warn: AlertTriangle, fail: XCircle };

export function NotificationRow({ item, variant, onRemove, onOpenLink }: NotificationRowProps) {
  const d = describeNotification(item);
  const isError = isErrorNotification(item);
  const unread = item.readAt === null;
  const isPage = variant === "page";
  const Icon = ICONS[d.icon];

  return (
    <li
      className={cn(
        "flex gap-3 py-3 pl-4 pr-2",
        unread && (isError ? "bg-red-50 dark:bg-red-950/40" : "bg-blue-50 dark:bg-blue-950/40"),
      )}
    >
      {isPage && (
        <span className="hidden w-[200px] shrink-0 truncate pt-1.5 text-sm text-muted-foreground sm:block">
          {item.automation.name}
        </span>
      )}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          isPage ? "h-[34px] w-[34px]" : "h-8 w-8",
          isError
            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
            : unread
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-grow flex-col gap-[3px]">
        <div className="flex items-center gap-1.5">
          {unread && (
            <span
              aria-label="Unread"
              className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
            />
          )}
          <span
            className={cn(
              "flex-grow text-[13px]",
              unread ? "font-semibold" : "font-medium text-muted-foreground",
            )}
          >
            {d.title}
          </span>
          {!isPage && (
            <span className="text-xs text-muted-foreground">
              {formatShortAge(item.occurredAt)}
            </span>
          )}
        </div>
        {isPage && (
          // The fixed name and clock columns don't fit a phone.
          <span
            data-testid="row-meta-mobile"
            className="truncate text-xs text-muted-foreground sm:hidden"
          >
            {item.automation.name} · {formatClock(item.occurredAt)}
          </span>
        )}
        <span className="text-[13px] text-muted-foreground" title={d.hint ?? undefined}>
          <b
            className={cn(
              "font-semibold",
              isError
                ? "text-red-700 dark:text-red-300"
                : unread
                  ? "text-green-700 dark:text-green-400"
                  : "text-foreground",
            )}
          >
            {d.lead}
          </b>
          {d.detail}
        </span>
        {d.link && (
          <Link
            href={d.link.href}
            onClick={() => onOpenLink(item.id)}
            className="self-start pt-1 text-[13px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            {d.link.label}
          </Link>
        )}
      </div>
      {isPage && (
        <span className="hidden w-[110px] shrink-0 pt-1.5 text-right text-xs text-muted-foreground sm:block">
          {formatClock(item.occurredAt)}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={isPage ? "Delete notification" : "Dismiss notification"}
        title={isPage ? "Delete" : "Dismiss"}
        className="h-7 w-7 shrink-0 text-muted-foreground"
        onClick={() => onRemove(item.id)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
