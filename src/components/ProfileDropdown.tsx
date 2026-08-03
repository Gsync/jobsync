"use client";

import { useState } from "react";
import Link from "next/link";
import { PowerIcon, Settings, Info } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ProfileDropdownProps {
  user: any;
  expanded: boolean;
  signOutAction: () => void;
}

export function ProfileDropdown({
  user,
  expanded,
  signOutAction,
}: ProfileDropdownProps) {
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const label = user?.email ?? "My Account";

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="User menu"
                className="navlink h-10 w-full text-muted-foreground hover:text-foreground"
              >
                <span className="flex h-full w-14 shrink-0 items-center justify-center">
                  <UserAvatar user={user} />
                </span>
                <span
                  className={cn(
                    "truncate text-sm transition-opacity duration-200",
                    expanded ? "opacity-100 delay-100" : "opacity-0"
                  )}
                >
                  {label}
                </span>
              </button>
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
          <DropdownMenuItem
            onClick={() => setSupportDialogOpen(true)}
            className="cursor-pointer"
          >
            <Info className="w-5 mr-2" />
            Support
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <form action={signOutAction}>
              <button type="submit" className="flex w-full items-center">
                <PowerIcon className="w-5 mr-2" />
                <div className="hidden md:block">Logout</div>
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SupportDialog
        open={supportDialogOpen}
        onOpenChange={setSupportDialogOpen}
      />
    </>
  );
}
