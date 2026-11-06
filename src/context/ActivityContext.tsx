"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { differenceInMilliseconds } from "date-fns";
import {
  endBreak as endBreakAction,
  getCurrentActivity,
  startActivityById,
  startBreak as startBreakAction,
  stopActivityById,
  updateBreakLength,
} from "@/actions/activity.actions";
import { Activity, ActivityType } from "@/models/activity.model";
import { toastSuccess, toastError } from "@/lib/toast";
import { APP_CONSTANTS } from "@/lib/constants";

interface ActivityContextType {
  currentActivity: Activity | undefined;
  timeElapsed: number;
  isLoading: boolean;
  isOnBreak: boolean;
  startActivity: (activityId: string) => Promise<boolean>;
  stopActivity: (autoStop?: boolean) => Promise<boolean>;
  startBreak: (minutes: number) => Promise<void>;
  endBreak: () => Promise<void>;
  setBreakLength: (minutes: number) => Promise<void>;
  refreshCurrentActivity: () => Promise<Activity | undefined>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(
  undefined
);

// The 8h cap is wall clock (see plan decision 7); only the display is net.
const netElapsed = (wallMs: number, breakMinutes: number) =>
  Math.max(wallMs - breakMinutes * 60_000, 0);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [currentActivity, setCurrentActivity] = useState<Activity>();
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const breakMinutesRef = useRef(0);
  const stopActivityRef = useRef<((autoStop?: boolean) => Promise<boolean>) | null>(null);

  useEffect(() => {
    breakMinutesRef.current = currentActivity?.breakMinutes ?? 0;
  }, [currentActivity]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
    setTimeElapsed(0);
  }, []);

  const startTimer = useCallback((startTime: Date) => {
    stopTimer();

    const startMs = startTime.getTime();
    startTimeRef.current = startMs;
    const now = Date.now();
    const initialElapsed = differenceInMilliseconds(now, startMs);

    if (initialElapsed >= APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS) {
      return false; // Signal that auto-stop is needed
    }

    setTimeElapsed(netElapsed(initialElapsed, breakMinutesRef.current));

    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return;

      // Calculate elapsed from actual start time to avoid drift
      const elapsed = differenceInMilliseconds(Date.now(), startTimeRef.current);

      if (elapsed >= APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS) {
        setTimeElapsed(APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Without this the 8h backstop only fires on mount or a tab switch, so
        // a break forgotten in a visible tab locks the app for good.
        stopActivityRef.current?.(true);
        return;
      }

      setTimeElapsed(netElapsed(elapsed, breakMinutesRef.current));
    }, 1000);

    return true; // Timer started successfully
  }, [stopTimer]);

  const applyCurrentActivity = useCallback(
    ({
      activity,
      success,
    }: Awaited<ReturnType<typeof getCurrentActivity>>): Activity | undefined => {
      if (!isMountedRef.current) return undefined;

      if (success && activity) {
        setCurrentActivity(activity);
        return activity;
      }

      setCurrentActivity(undefined);
      stopTimer();
      return undefined;
    },
    [stopTimer],
  );

  const refreshCurrentActivity = useCallback(
    async (): Promise<Activity | undefined> =>
      applyCurrentActivity(await getCurrentActivity()),
    [applyCurrentActivity],
  );

  const stopActivity = useCallback(
    async (autoStop: boolean = false): Promise<boolean> => {
      if (!currentActivity) return false;

      const { success, discarded, message } = await stopActivityById(
        currentActivity.id!,
        new Date(),
      );

      if (!isMountedRef.current) return success;

      if (!success) {
        // The running activity is a per-user singleton, so another session may
        // have already ended it — resync so a stale copy can't leave an
        // undismissable banner.
        await refreshCurrentActivity();
        toastError(message);
        return false;
      }

      stopTimer();
      setCurrentActivity(undefined);

      if (discarded) {
        toastError(
          `Activity not saved because duration was less than ${APP_CONSTANTS.ACTIVITY_MIN_DURATION_MINUTES} minutes`
        );
        return true;
      }

      toastSuccess(
        autoStop
          ? `Activity auto-stopped after reaching maximum duration of ${
              APP_CONSTANTS.ACTIVITY_MAX_DURATION_MINUTES / 60
            } hours`
          : "Activity stopped successfully"
      );
      return true;
    },
    [currentActivity, stopTimer, refreshCurrentActivity]
  );

  useEffect(() => {
    stopActivityRef.current = stopActivity;
  }, [stopActivity]);

  const startActivity = useCallback(
    async (activityId: string): Promise<boolean> => {
      setIsLoading(true);
      const { newActivity, success, message } = await startActivityById(activityId);

      if (!isMountedRef.current) {
        setIsLoading(false);
        return success;
      }

      if (success && newActivity) {
        setCurrentActivity(newActivity as Activity);
        toastSuccess("Activity started successfully");
        setIsLoading(false);
        return true;
      } else {
        toastError(message);
        setIsLoading(false);
        return false;
      }
    },
    []
  );

  const startBreak = useCallback(
    async (minutes: number) => {
      if (!currentActivity) return;

      const { activity, success, message } = await startBreakAction(
        currentActivity.id!,
        minutes,
      );

      if (!isMountedRef.current) return;

      if (success && activity) {
        setCurrentActivity(activity as Activity);
        return;
      }

      toastError(message);
      await refreshCurrentActivity();
    },
    [currentActivity, refreshCurrentActivity],
  );

  const endBreak = useCallback(async () => {
    if (!currentActivity) return;

    const { activity, success, message } = await endBreakAction(
      currentActivity.id!,
    );

    if (!isMountedRef.current) return;

    if (success && activity) {
      setCurrentActivity(activity as Activity);
      return;
    }

    toastError(message);
    await refreshCurrentActivity();
  }, [currentActivity, refreshCurrentActivity]);

  // Optimistic: the ring must redraw on the click, not a round trip later.
  const setBreakLength = useCallback(
    async (minutes: number) => {
      if (!currentActivity) return;

      setCurrentActivity({ ...currentActivity, breakPlannedMins: minutes });

      const { success } = await updateBreakLength(currentActivity.id!, minutes);

      if (!isMountedRef.current || success) return;

      await refreshCurrentActivity();
    },
    [currentActivity, refreshCurrentActivity],
  );

  // Handle timer when currentActivity changes. Deferred a macrotask so the
  // first tick (and the max-duration auto-stop) is not in the effect body.
  useEffect(() => {
    const first = setTimeout(() => {
      if (currentActivity) {
        const timerStarted = startTimer(currentActivity.startTime);
        if (!timerStarted) {
          // Activity exceeded max duration, auto-stop it
          stopActivity(true);
        }
      } else {
        stopTimer();
      }
    }, 0);
    return () => clearTimeout(first);
  }, [currentActivity, startTimer, stopTimer, stopActivity]);

  // Handle visibility change to sync timer when tab becomes visible
  useEffect(() => {
    const resync = () => {
      if (!currentActivity) return;

      // Break state is per-user and can change in another tab or window; trust
      // the server copy over the local one on every return to the foreground.
      refreshCurrentActivity();

      if (!startTimeRef.current) return;

      const elapsed = differenceInMilliseconds(Date.now(), startTimeRef.current);
      if (elapsed >= APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS) {
        stopActivity(true);
      } else {
        setTimeElapsed(netElapsed(elapsed, breakMinutesRef.current));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      resync();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", resync);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", resync);
    };
  }, [currentActivity, stopActivity, refreshCurrentActivity]);

  // Fetch current activity on mount and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    getCurrentActivity().then(applyCurrentActivity);

    return () => {
      isMountedRef.current = false;
      stopTimer();
    };
  }, [applyCurrentActivity, stopTimer]);

  return (
    <ActivityContext.Provider
      value={{
        currentActivity,
        timeElapsed,
        isLoading,
        isOnBreak: Boolean(currentActivity?.breakStartedAt),
        startActivity,
        stopActivity,
        startBreak,
        endBreak,
        setBreakLength,
        refreshCurrentActivity,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
