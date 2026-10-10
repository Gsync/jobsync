"use client";

import { TriangleAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildIncompleteResumeHint } from "@/lib/resumeSections";

export function IncompleteResumeHint() {
  const hint = buildIncompleteResumeHint();
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* pointer-events-auto: a disabled Select item is pointer-events-none */}
          <span
            data-incomplete-hint
            className="pointer-events-auto ml-2 inline-flex"
          >
            <TriangleAlert
              className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500"
              role="img"
              aria-label={hint}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
