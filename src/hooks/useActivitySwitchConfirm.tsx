"use client";
import { useCallback, useState } from "react";
import { useActivity } from "@/context/ActivityContext";
import { DeleteAlertDialog } from "@/components/DeleteAlertDialog";

export function useActivitySwitchConfirm() {
  const { currentActivity, stopActivity } = useActivity();
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestStart = useCallback(
    (action: () => void) => {
      if (currentActivity) {
        setPendingAction(() => action);
      } else {
        action();
      }
    },
    [currentActivity],
  );

  const confirmSwitch = useCallback(async () => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    await stopActivity();
    action();
  }, [pendingAction, stopActivity]);

  const confirmDialog = (
    <DeleteAlertDialog
      pageTitle="activity"
      open={pendingAction !== null}
      onOpenChange={(open) => !open && setPendingAction(null)}
      onDelete={confirmSwitch}
      alertTitle="Stop current activity and start a new one?"
      alertDescription={
        currentActivity
          ? `"${currentActivity.activityName}" is currently in progress. Stop it and start the new activity?`
          : undefined
      }
      actionLabel="Stop & Start"
      actionVariant="default"
    />
  );

  return { requestStart, confirmDialog };
}
