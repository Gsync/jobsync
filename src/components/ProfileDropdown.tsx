"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PowerIcon,
  Settings,
  Info,
  ArrowUpCircle,
  ExternalLink,
  Bell,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import UserAvatar from "./UserAvatar";
import { SupportDialog } from "./SupportDialog";
import { useAppVersion } from "@/hooks/useAppVersion";
import { useNotifications } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { CurrentUser } from "@/models/user.model";
import { Button } from "@/components/ui/button";

interface ProfileDropdownProps {
  user: CurrentUser | null;
  expanded: boolean;
  signOutAction: () => void;
}

export function ProfileDropdown({
  user,
  expanded,
  signOutAction,
}: ProfileDropdownProps) {
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const version = useAppVersion();
  const { summary } = useNotifications();
  const label = user?.email ?? "My Account";

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                type="button"
                aria-label="User menu"
                className="navlink h-10 w-full justify-start gap-0 p-0 text-muted-foreground"
              >
                <span className="relative flex h-full w-14 shrink-0 items-center justify-center">
                  <UserAvatar user={user} />
                  {summary.unread > 0 ? (
                    <>
                      <span
                        aria-hidden
                        data-testid="avatar-dot"
                        className={cn(
                          "absolute right-3 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                          summary.unreadErrors > 0 ? "bg-destructive" : "bg-primary"
                        )}
                      />
                      <span className="sr-only">Unread notifications</span>
                    </>
                  ) : (
                    version?.updateAvailable && (
                      <>
                        <span
                          aria-hidden
                          data-testid="avatar-dot"
                          className="absolute right-3 top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
                        />
                        <span className="sr-only">Update available</span>
                      </>
                    )
                  )}
                </span>
                <span
                  className={cn(
                    "truncate text-sm transition-opacity duration-200",
                    expanded ? "opacity-100 delay-100" : "opacity-0"
                  )}
                >
                  {label}
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {!expanded && <TooltipContent side="right">{label}</TooltipContent>}
        </Tooltip>
        <DropdownMenuContent side="right" align="end">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="cursor-pointer">
              <Settings className="w-5 mr-2" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/notifications" className="cursor-pointer">
              <Bell className="w-5 mr-2" />
              <span className="flex-1">Notifications</span>
              {summary.unread > 0 && (
                <span
                  className={cn(
                    "ml-2 rounded-full px-1.5 text-[11px] font-semibold",
                    summary.unreadErrors > 0
                      ? "bg-destructive-bg text-destructive-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {summary.unread}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSupportDialogOpen(true)}
            className="cursor-pointer"
          >
            <Info className="w-5 mr-2" />
            Support
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://github.com/Gsync/jobsync/wiki"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <ExternalLink className="w-5 mr-2" />
              Wiki
            </a>
          </DropdownMenuItem>
          {version?.updateAvailable && (
            <DropdownMenuItem
              onClick={() => setSupportDialogOpen(true)}
              className="cursor-pointer text-primary focus:text-primary"
            >
              <ArrowUpCircle className="w-5 mr-2" />
              Update available
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <form action={signOutAction}>
              <button type="submit" className="flex w-full items-center">
                <PowerIcon className="w-5 mr-2" />
                <span>Logout</span>
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SupportDialog
        open={supportDialogOpen}
        onOpenChange={setSupportDialogOpen}
        version={version}
      />
    </>
  );
}
