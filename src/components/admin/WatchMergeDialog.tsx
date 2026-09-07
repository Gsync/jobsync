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
import { PROVIDER_META } from "@/components/automations/ats-search-step/types";
import type { JobBoard } from "@/models/automation.model";

export type PendingMerge = {
  provider: JobBoard;
  board: { name: string; token: string; host?: "default" | "eu" };
  existing: { id: string; label: string };
};

type Props = {
  pending: PendingMerge | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// There is no "create a separate entry" option: @@unique([value, createdBy])
// forbids a second row with the same canonical value.
export function WatchMergeDialog({ pending, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open={!!pending} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Link this board?</AlertDialogTitle>
          <AlertDialogDescription>
            You already track <strong>{pending?.existing.label}</strong>. Link
            its {pending && PROVIDER_META[pending.provider].label} board{" "}
            <code>{pending?.board.token}</code> to that company?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Link board</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
