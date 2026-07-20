"use client";

import { useSidebar } from "@/context/SidebarContext";
import { APP_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Offsets page content by the sidebar's current width.
function SidebarInset({ children }: { children: React.ReactNode }) {
  const { expanded } = useSidebar();
  return (
    <div
      className={cn(
        "flex flex-1 flex-col transition-[padding] duration-200 ease-in-out sm:gap-4 sm:py-4",
        expanded
          ? APP_CONSTANTS.SIDEBAR_WIDTH.expanded.contentOffset
          : APP_CONSTANTS.SIDEBAR_WIDTH.collapsed.contentOffset
      )}
    >
      {children}
    </div>
  );
}

export default SidebarInset;
