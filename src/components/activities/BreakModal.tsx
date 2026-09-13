"use client";
import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Minus, Pause, Play, Plus, CircleStop, X } from "lucide-react";
import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeleteAlertDialog } from "@/components/DeleteAlertDialog";
import { BreakRing } from "./BreakRing";
import { useActivity } from "@/context/ActivityContext";
import { APP_CONSTANTS } from "@/lib/constants";
import { toastSuccess } from "@/lib/toast";

const formatClock = (totalSeconds: number) => {
  const safe = Math.max(totalSeconds, 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

interface BreakModalProps {
  open: boolean;
  onClose: () => void;
}

export function BreakModal({ open, onClose }: BreakModalProps) {
  const {
    currentActivity,
    isOnBreak,
    startBreak,
    endBreak,
    setBreakLength,
    stopActivity,
  } = useActivity();
  const [now, setNow] = useState(() => Date.now());
  const [draftMinutes, setDraftMinutes] = useState<number>(
    APP_CONSTANTS.ACTIVITY_BREAK_DEFAULT_MINUTES,
  );
  const [pending, setPending] = useState(false);
  const [confirmStopOpen, setConfirmStopOpen] = useState(false);
  const overtimeWarnedRef = useRef(false);

  // A primitive, not the Date: every context refresh builds a new Date object
  // and would otherwise restart the interval on each render.
  const breakStartedMs = currentActivity?.breakStartedAt
    ? new Date(currentActivity.breakStartedAt).getTime()
    : null;

  useEffect(() => {
    if (!breakStartedMs) {
      overtimeWarnedRef.current = false;
      return;
    }

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [breakStartedMs]);

  // Until the user presses play there is no break record, so the length lives
  // in local state and is handed to startBreak on the first click.
  const plannedMinutes = isOnBreak
    ? (currentActivity?.breakPlannedMins ??
      APP_CONSTANTS.ACTIVITY_BREAK_DEFAULT_MINUTES)
    : draftMinutes;
  const plannedMs = plannedMinutes * 60_000;
  const elapsedMs = breakStartedMs ? Math.max(now - breakStartedMs, 0) : 0;
  const isOver = elapsedMs >= plannedMs;

  // Re-arm whenever the break stops being over, so extending a run-over break
  // notifies again at the new limit — shortening one already over does not.
  // Must be declared before the effect below; effects run in order.
  useEffect(() => {
    if (!isOver) overtimeWarnedRef.current = false;
  }, [isOver]);

  useEffect(() => {
    if (!isOver || overtimeWarnedRef.current || !breakStartedMs) return;
    overtimeWarnedRef.current = true;
    toastSuccess("Break time is up");
  }, [isOver, breakStartedMs]);

  if (!open || !currentActivity) return null;

  const changeLength = (minutes: number) => {
    const clamped = Math.min(
      Math.max(minutes, APP_CONSTANTS.ACTIVITY_BREAK_MIN_MINUTES),
      APP_CONSTANTS.ACTIVITY_BREAK_MAX_MINUTES,
    );

    if (isOnBreak) {
      setBreakLength(clamped);
      return;
    }

    setDraftMinutes(clamped);
  };

  const handleStart = async () => {
    setPending(true);
    await startBreak(plannedMinutes);
    setPending(false);
  };

  const handleResume = async () => {
    setPending(true);
    await endBreak();
    setPending(false);
    onClose();
  };

  const handleStop = () => {
    setConfirmStopOpen(false);
    stopActivity();
    onClose();
  };

  return (
    <DialogPrimitive.Root open>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background p-6 shadow-lg"
        >
          <DialogTitle className="sr-only">Break in progress</DialogTitle>

          {/* Only an unstarted break can be walked away from; once it is
              running the pause button is the way out. */}
          {!isOnBreak && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}

          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <BreakRing elapsedMs={elapsedMs} plannedMs={plannedMs} />
              <button
                type="button"
                disabled={pending}
                aria-label={isOnBreak ? "Resume activity" : "Start break"}
                title={isOnBreak ? "Resume activity" : "Start break"}
                onClick={isOnBreak ? handleResume : handleStart}
                className="absolute inset-0 m-auto flex size-20 flex-col items-center justify-center gap-1 rounded-full bg-background text-muted-foreground transition-colors hover:text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {isOnBreak ? (
                  <Pause className="size-8" />
                ) : (
                  <Play className="size-8" />
                )}
                <span className="text-xs font-medium">
                  {isOnBreak ? "Resume" : "Start"}
                </span>
              </button>
            </div>

            <div className="text-center">
              <div className="text-4xl font-semibold tabular-nums">
                {isOver
                  ? `+${formatClock(Math.floor((elapsedMs - plannedMs) / 1000))}`
                  : formatClock(Math.ceil((plannedMs - elapsedMs) / 1000))}
              </div>
              <div className="text-sm text-muted-foreground">
                {isOver ? "Break over" : "Break"}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                aria-label="Decrease break length"
                disabled={
                  plannedMinutes <= APP_CONSTANTS.ACTIVITY_BREAK_MIN_MINUTES
                }
                onClick={() =>
                  changeLength(
                    plannedMinutes - APP_CONSTANTS.ACTIVITY_BREAK_STEP_MINUTES,
                  )
                }
              >
                <Minus className="size-4" />
              </Button>

              {APP_CONSTANTS.ACTIVITY_BREAK_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={preset === plannedMinutes ? "default" : "outline"}
                  onClick={() => changeLength(preset)}
                >
                  {preset} min
                </Button>
              ))}

              <Button
                variant="outline"
                size="icon"
                aria-label="Increase break length"
                disabled={
                  plannedMinutes >= APP_CONSTANTS.ACTIVITY_BREAK_MAX_MINUTES
                }
                onClick={() =>
                  changeLength(
                    plannedMinutes + APP_CONSTANTS.ACTIVITY_BREAK_STEP_MINUTES,
                  )
                }
              >
                <Plus className="size-4" />
              </Button>
            </div>

            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={pending}
                onClick={isOnBreak ? handleResume : handleStart}
              >
                {isOnBreak ? (
                  <Pause className="mr-2 size-4" />
                ) : (
                  <Play className="mr-2 size-4" />
                )}
                {isOnBreak ? "Resume Activity" : "Start Break"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmStopOpen(true)}
              >
                <CircleStop className="mr-2 size-4 text-red-500 dark:text-red-400" />
                Stop Activity
              </Button>
            </div>
          </div>

          <DeleteAlertDialog
            pageTitle="activity"
            open={confirmStopOpen}
            onOpenChange={setConfirmStopOpen}
            onDelete={handleStop}
            alertTitle="Stop this activity?"
            alertDescription="This ends and logs the activity, break time included. It cannot be resumed afterwards."
            actionLabel="Stop Activity"
          />
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
