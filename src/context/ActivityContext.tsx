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
import { differenceInMilliseconds, differenceInMinutes } from "date-fns";
import {
  getCurrentActivity,
  startActivityById,
  stopActivityById,
} from "@/actions/activity.actions";
import { Activity, ActivityType } from "@/models/activity.model";
import { toast } from "@/components/ui/use-toast";
import { APP_CONSTANTS } from "@/lib/constants";

interface ActivityContextType {
  currentActivity: Activity | undefined;
  timeElapsed: number;
  isLoading: boolean;
  startActivity: (activityId: string) => Promise<boolean>;
  stopActivity: (autoStop?: boolean) => Promise<boolean>;
  refreshCurrentActivity: () => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(
  undefined
);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [currentActivity, setCurrentActivity] = useState<Activity>();
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

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

    setTimeElapsed(initialElapsed);

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
        return;
      }

      setTimeElapsed(elapsed);
    }, 1000);

    return true; // Timer started successfully
  }, [stopTimer]);

  const stopActivity = useCallback(
    async (autoStop: boolean = false): Promise<boolean> => {
      if (!currentActivity) return false;

      const now = new Date();
      const maxDurationMinutes =
        APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS / (1000 * 60);
      const duration = Math.min(
        differenceInMinutes(now, currentActivity.startTime),
        maxDurationMinutes
      );

      const { success, message } = await stopActivityById(
        currentActivity.id!,
        now,
        duration
      );

      if (!isMountedRef.current) return success;

      if (success) {
        stopTimer();
        setCurrentActivity(undefined);
        toast({
          variant: "success",
          description: autoStop
            ? `Activity auto-stopped after reaching maximum duration of ${maxDurationMinutes / 60} hours`
            : "Activity stopped successfully",
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
        return false;
      }
    },
    [currentActivity, stopTimer]
  );

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
        toast({
          variant: "success",
          description: "Activity started successfully",
        });
        setIsLoading(false);
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
        setIsLoading(false);
        return false;
      }
    },
    []
  );

  const refreshCurrentActivity = useCallback(async () => {
    const { activity, success } = await getCurrentActivity();
    if (!isMountedRef.current) return;

    if (success && activity) {
      setCurrentActivity(activity);
    } else {
      setCurrentActivity(undefined);
      stopTimer();
    }
  }, [stopTimer]);

  // Handle timer when currentActivity changes
  useEffect(() => {
    if (currentActivity) {
      const timerStarted = startTimer(currentActivity.startTime);
      if (!timerStarted) {
        // Activity exceeded max duration, auto-stop it
        stopActivity(true);
      }
    } else {
      stopTimer();
    }
  }, [currentActivity, startTimer, stopTimer, stopActivity]);

  // Handle visibility change to sync timer when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && currentActivity && startTimeRef.current) {
        const elapsed = differenceInMilliseconds(Date.now(), startTimeRef.current);
        if (elapsed >= APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS) {
          stopActivity(true);
        } else {
          setTimeElapsed(elapsed);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentActivity, stopActivity]);

  // Fetch current activity on mount and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    refreshCurrentActivity();

    return () => {
      isMountedRef.current = false;
      stopTimer();
    };
  }, [refreshCurrentActivity, stopTimer]);

  return (
    <ActivityContext.Provider
      value={{
        currentActivity,
        timeElapsed,
        isLoading,
        startActivity,
        stopActivity,
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
