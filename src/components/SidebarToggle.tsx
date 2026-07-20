"use client";

import { PanelLeft } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/context/SidebarContext";
import { APP_CONSTANTS } from "@/lib/constants";

// Desktop counterpart to the mobile Sheet trigger in Header.
function SidebarToggle() {
  const { expanded, toggle } = useSidebar();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={APP_CONSTANTS.SIDEBAR_DOM_ID}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className="hidden sm:inline-flex"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {expanded ? "Collapse sidebar" : "Expand sidebar"}
          <kbd className="ml-2 rounded border px-1 text-[10px]">⌘B</kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SidebarToggle;
