"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "@/lib/utils";

import { Bell } from "lucide-react";

export type NotificationItem = Readonly<{
  id: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
}>;

export type NotificationDropdownProps = Readonly<
  {
    triggerAriaLabel?: string;
    menuAriaLabel?: string;
    headerTitle?: string;
    markAllLabel?: string;
    emptyLabel?: string;
    notifications?: readonly NotificationItem[];
    onNotificationClick?: (item: NotificationItem) => void;
    onMarkAllRead?: () => void;
  } & ComponentPropsWithoutRef<"div">
>;

const defaultNotifications: readonly NotificationItem[] = [
  {
    id: "comment",
    title: "New comment",
    body: "Sarah replied on your post",
    time: "2m",
    unread: true,
  },
  {
    id: "deploy",
    title: "Deploy succeeded",
    body: "Production build finished",
    time: "1h",
    unread: true,
  },
  {
    id: "invite",
    title: "Invite accepted",
    body: "Alex joined your workspace",
    time: "1d",
    unread: false,
  },
];

type NotificationRowProps = Readonly<{
  item: NotificationItem;
  onSelect: (item: NotificationItem) => void;
}>;

function NotificationRow({ item, onSelect }: NotificationRowProps) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-label={`${item.title}. ${item.body}`}
      onClick={() => onSelect(item)}
      className={cn(
        "flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
        item.unread
          ? "border-neutral-200 bg-white hover:border-neutral-300"
          : "border-transparent bg-transparent hover:bg-white",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-medium text-neutral-800">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-neutral-400">
          {item.body}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[9px] text-neutral-400">
        {item.time}
      </span>
    </button>
  );
}

// Notification panel — square trigger, inset gray tray with card rows.
export const NotificationDropdown = forwardRef<
  HTMLDivElement,
  NotificationDropdownProps
>(
  (
    {
      triggerAriaLabel = "Notifications",
      menuAriaLabel = "Notification list",
      headerTitle = "Inbox",
      markAllLabel = "Clear",
      emptyLabel = "Nothing new",
      notifications = defaultNotifications,
      onNotificationClick,
      onMarkAllRead,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    const unreadCount = notifications.filter((n) => n.unread).length;

    useEffect(() => {
      const closeOnOutside = (event: globalThis.MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) {
          setOpen(false);
        }
      };

      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };

      document.addEventListener("mousedown", closeOnOutside);
      document.addEventListener("keydown", closeOnEscape);
      return () => {
        document.removeEventListener("mousedown", closeOnOutside);
        document.removeEventListener("keydown", closeOnEscape);
      };
    }, []);

    const handleNotificationSelect = (item: NotificationItem) => {
      setOpen(false);
      onNotificationClick?.(item);
    };

    const toggleOpen = () => setOpen((prev) => !prev);

    return (
      <div
        ref={ref}
        data-slot="notification-dropdown"
        className={cn("relative inline-block font-sans", className)}
        {...props}
      >
        <div ref={rootRef} className="relative">
          <button
            type="button"
            aria-label={
              unreadCount > 0
                ? `${triggerAriaLabel}, ${unreadCount} unread`
                : triggerAriaLabel
            }
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={open ? menuId : undefined}
            onClick={toggleOpen}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleOpen();
              }
            }}
            className={cn(
              "relative inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border bg-white transition-colors",
              open
                ? "border-neutral-200"
                : "border-neutral-100 hover:border-neutral-200",
            )}
          >
            <Bell size={16} strokeWidth={2} className="text-neutral-500" />
            {unreadCount > 0 ? (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-neutral-800 text-[8px] font-bold text-white"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <div
              id={menuId}
              role="menu"
              aria-label={menuAriaLabel}
              className="absolute top-[calc(100%+8px)] right-0 z-100 w-60 rounded-xl bg-neutral-50 p-2 md:w-64"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold text-neutral-700">
                  {headerTitle}
                </p>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onMarkAllRead?.()}
                    className="cursor-pointer text-[10px] font-medium text-neutral-400 hover:text-neutral-600"
                  >
                    {markAllLabel}
                  </button>
                ) : null}
              </div>

              <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onSelect={handleNotificationSelect}
                    />
                  ))
                ) : (
                  <p className="py-6 text-center text-[11px] text-neutral-400">
                    {emptyLabel}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

NotificationDropdown.displayName = "NotificationDropdown";
