"use client";
import Link from "next/link";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Briefcase, Settings } from "lucide-react";
import { APP_CONSTANTS, SIDEBAR_LINKS } from "@/lib/constants";
import NavLink from "./NavLink";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";

function Sidebar() {
  const path = usePathname();
  const { expanded } = useSidebar();

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        id={APP_CONSTANTS.SIDEBAR_DOM_ID}
        className={cn(
          "fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background transition-[width] duration-200 ease-in-out sm:flex",
          expanded
            ? APP_CONSTANTS.SIDEBAR_WIDTH.expanded.rail
            : APP_CONSTANTS.SIDEBAR_WIDTH.collapsed.rail
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2",
            expanded ? "px-4" : "justify-center"
          )}
        >
          <Link
            href="/"
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground md:h-8 md:w-8"
          >
            <Briefcase className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="sr-only">JobSync</span>
          </Link>
          {expanded && <span className="truncate font-semibold">JobSync</span>}
        </div>

        <nav
          className={cn(
            "flex flex-1 flex-col overflow-y-auto py-2",
            expanded ? "gap-0.5" : "gap-2"
          )}
        >
          {SIDEBAR_LINKS.map((item) => {
            // Only show dev-only items in development mode
            if (item.devOnly && process.env.NODE_ENV !== "development") {
              return null;
            }
            return (
              <NavLink
                key={item.label}
                label={item.label}
                Icon={item.icon}
                route={item.route}
                pathname={path}
                expanded={expanded}
              />
            );
          })}
        </nav>

        <div
          className={cn(
            "flex flex-col py-2",
            expanded ? "gap-0.5 border-t" : "gap-2"
          )}
        >
          <NavLink
            label="Settings"
            Icon={Settings}
            route="/dashboard/settings"
            pathname={path}
            expanded={expanded}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
