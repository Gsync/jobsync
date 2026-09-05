"use client";

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

interface AutomationDetailDialogsProps {
  abortConfirmOpen: boolean;
  onAbortConfirmOpenChange: (open: boolean) => void;
  onAbortRun: () => void;
  deleteConfirmOpen: boolean;
  onDeleteConfirmOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function AutomationDetailDialogs({
  abortConfirmOpen,
  onAbortConfirmOpenChange,
  onAbortRun,
  deleteConfirmOpen,
  onDeleteConfirmOpenChange,
  onDelete,
  isDeleting,
}: AutomationDetailDialogsProps) {
  return (
    <>
      <AlertDialog
        open={abortConfirmOpen}
        onOpenChange={onAbortConfirmOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abort this run?</AlertDialogTitle>
            <AlertDialogDescription>
              The run will stop after the current step. Jobs already discovered
              are kept; remaining jobs won&apos;t be processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep running</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={(e) => {
                e.preventDefault();
                onAbortRun();
              }}
            >
              Abort run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={onDeleteConfirmOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action
              cannot be undone. Discovered jobs will remain but lose their
              automation reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
