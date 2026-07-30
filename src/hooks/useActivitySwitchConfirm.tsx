"use client";
import { useCallback, useState } from "react";
import { useActivity } from "@/context/ActivityContext";
import { DeleteAlertDialog } from "@/components/DeleteAlertDialog";

// Returning false means the start was rejected; anything else counts as done.
type StartAction = () => boolean | void | Promise<boolean | void>;

export function useActivitySwitchConfirm() {
  const { currentActivity, stopActivity, refreshCurrentActivity } =
    useActivity();
  const [pendingAction, setPendingAction] = useState<StartAction | null>(null);

  // The running activity is a per-user singleton, so another session may have
  // claimed it since this page last synced — a start that looked valid against
  // local state gets rejected server-side. Resync and offer the switch rather
  // than dead-ending on an error toast.
  const runStart = useCallback(
    async (action: StartAction) => {
      const started = await action();
      if (started !== false) return;
      const running = await refreshCurrentActivity();
      if (running) setPendingAction(() => action);
    },
    [refreshCurrentActivity],
  );

  const requestStart = useCallback(
    (action: StartAction) => {
      if (currentActivity) {
        setPendingAction(() => action);
      } else {
        runStart(action);
      }
    },
    [currentActivity, runStart],
  );

  const confirmSwitch = useCallback(async () => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    await stopActivity();
    await runStart(action);
  }, [pendingAction, stopActivity, runStart]);

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
