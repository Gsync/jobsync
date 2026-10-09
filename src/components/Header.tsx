"use client";

import Link from "next/link";
import { PanelLeft, Briefcase } from "lucide-react";

import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SIDEBAR_LINKS } from "@/lib/constants";
import SidebarToggle from "./SidebarToggle";
import NavLink from "./NavLink";
import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AgentChatTrigger } from "./AgentChatTrigger";
import { NotificationBell } from "./notifications/NotificationBell";

function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4 sm:gap-3">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="overflow-y-auto sm:max-w-xs">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <TooltipProvider><nav aria-label="Mobile navigation" className="grid gap-1 pt-6">
            <SheetClose asChild>
              <Link
                href="/dashboard"
                className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary text-lg font-semibold text-primary-foreground md:text-base"
              >
                <Briefcase className="h-5 w-5 transition-all group-hover:scale-110" />
                <span className="sr-only">JobSync</span>
              </Link>
            </SheetClose>
            {SIDEBAR_LINKS.map((item) => {
              // Only show dev-only items in development mode
              if (item.devOnly && process.env.NODE_ENV !== "development") {
                return null;
              }
              return (
                <SheetClose asChild key={item.label}>
                  <NavLink label={item.label} Icon={item.icon} route={item.route} pathname={pathname} expanded />
                </SheetClose>
              );
            })}
          </nav></TooltipProvider>
        </SheetContent>
      </Sheet>
      <SidebarToggle />
      <h1 className="text-sm font-semibold">JobSync</h1>
      <span className="hidden text-sm text-muted-foreground md:inline">Job search workspace</span>
      <div className="ml-auto" />

      <NotificationBell />
      <AgentChatTrigger />
    </header>
  );
}

export default Header;
