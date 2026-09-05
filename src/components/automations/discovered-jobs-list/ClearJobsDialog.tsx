"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { toastSuccess, toastError } from "@/lib/toast";
import { clearDiscoveredJobs } from "@/actions/automation.actions";

interface ClearJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  includeNew: boolean;
  onIncludeNewChange: (includeNew: boolean) => void;
  newCount: number;
  automationId: string;
  onRefresh: () => void;
}

export function ClearJobsDialog({
  open,
  onOpenChange,
  includeNew,
  onIncludeNewChange,
  newCount,
  automationId,
  onRefresh,
}: ClearJobsDialogProps) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    const result = await clearDiscoveredJobs({
      automationId,
      includeNew,
    });
    setClearing(false);
    onOpenChange(false);

    if (result.success) {
      toastSuccess(`Removed ${result.deleted ?? 0} job(s).`, "Discovered jobs cleared");
      onRefresh();
    } else {
      toastError(result.message);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear discovered jobs?</AlertDialogTitle>
          <AlertDialogDescription>
            Accepted jobs are always kept. This permanently deletes all
            dismissed jobs
            {includeNew && newCount > 0 ? " and all unreviewed new jobs" : ""}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {newCount > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={includeNew}
              onChange={(e) => onIncludeNewChange(e.target.checked)}
            />
            Also delete {newCount} unreviewed new job(s)
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={clearing}
            onClick={(e) => {
              e.preventDefault();
              handleClear();
            }}
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
