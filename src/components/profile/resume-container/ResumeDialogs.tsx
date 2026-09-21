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
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";

export function AttachPdfDialog({
  open,
  onOpenChange,
  onChoice,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoice: (choice: "replace" | "download-only") => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace existing attachment?</AlertDialogTitle>
          <AlertDialogDescription>
            This resume already has a file attached. Would you like to replace
            it with the exported PDF?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={() => onChoice("download-only")}>
            Download only
          </Button>
          <AlertDialogAction onClick={() => onChoice("replace")}>
            Replace attachment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ClearChatBeforeReviewDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear the assistant conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            A job is waiting for your approval in the assistant. Starting a
            review clears the conversation, and that job will not be saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Clear and review
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DiscardImportDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard import?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete this resume and its attached file. Unsaved
            suggestions will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive-bg text-destructive-foreground hover:bg-destructive-bg/90"
            onClick={onConfirm}
          >
            Discard import
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
