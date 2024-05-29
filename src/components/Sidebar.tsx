"use client";
import Link from "next/link";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Briefcase, Settings } from "lucide-react";
import { SIDEBAR_LINKS } from "@/lib/constants";
import NavLink from "./NavLink";
import { usePathname } from "next/navigation";

function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="/"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <Briefcase className="h-4 w-4 transition-all group-hover:scale-110" />
          <span className="sr-only">JobSync</span>
        </Link>
        <TooltipProvider delayDuration={800}>
          {SIDEBAR_LINKS.map((item) => {
            return (
              <div key={item.label} className="text-white fill-color">
                <NavLink
                  label={item.label}
                  Icon={item.icon}
                  route={item.route}
                  pathname={path}
                />
              </div>
            );
          })}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <TooltipProvider>
          <NavLink
            label="Settings"
            Icon={Settings}
            route="/dashboard/settings"
            pathname={path}
          />
        </TooltipProvider>
      </nav>
    </aside>
  );
}

export default Sidebar;
