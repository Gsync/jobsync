"use client";
import ActivitiesTable from "./ActivitiesTable";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PlusCircle, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ActivityForm } from "./ActivityForm";
import {
  getActivitiesList,
  getCurrentActivity,
  startActivityById,
  stopActivityById,
} from "@/actions/activity.actions";
import { Activity, ActivityType } from "@/models/activity.model";
import { toast } from "../ui/use-toast";
import Loading from "../Loading";
import { ActivityBanner } from "./ActivityBanner";
import { differenceInMinutes } from "date-fns";
import { APP_CONSTANTS } from "@/lib/constants";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";

function ActivitiesContainer() {
  const [activityFormOpen, setActivityFormOpen] = useState<boolean>(false);
  const [activitiesList, setActivitiesList] = useState<Activity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<Activity>();
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalActivities, setTotalActivities] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const hasSearched = useRef(false);

  const closeActivityForm = () => setActivityFormOpen(false);

  const stopTimer = useCallback(() => {
    // Clear the timer and reset elapsed time
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeElapsed(0);
  }, []);

  const loadActivities = useCallback(
    async (page: number, limit: number, search?: string) => {
      setLoading(true);
      try {
        const { data, success, message, total } = await getActivitiesList(
          page,
          limit,
          search
        );
        if (success) {
          setActivitiesList((prev) => (page === 1 ? data : [...prev, ...data]));
          setTotalActivities(total);
          setPage(page);
        } else {
          toast({
            variant: "destructive",
            title: "Error!",
            description: message,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: "Failed to load activities. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reloadActivities = useCallback(async () => {
    await loadActivities(1, recordsPerPage, searchTerm || undefined);
  }, [loadActivities, recordsPerPage, searchTerm]);

  const stopActivity = useCallback(
    async (autoStop: boolean = false) => {
      if (!currentActivity) return;
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
      if (success) {
        stopTimer();
        setCurrentActivity(undefined);
        reloadActivities();
        toast({
          variant: "success",
          description: autoStop
            ? `Activity auto-stopped after reaching maximum duration of ${
                maxDurationMinutes / 60
              } hours`
            : "Activity stopped successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
    },
    [currentActivity, reloadActivities, stopTimer]
  );

  const startTimer = useCallback(
    (startTime: number) => {
      const initialElapsed = Date.now() - startTime;

      // Check if the initial elapsed time already exceeds the MAX duration
      if (initialElapsed >= APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS) {
        setTimeout(() => stopActivity(true), 0);
        return;
      }

      stopTimer(); // Clear any existing timer to avoid duplicates
      setTimeElapsed(initialElapsed);

      // Start the interval timer
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => {
          const newElapsed = prev + 1000;
          if (newElapsed >= APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setTimeout(() => stopActivity(true), 0);
            return APP_CONSTANTS.ACTIVITY_MAX_DURATION_MS;
          }
          return newElapsed;
        });
      }, 1000);
    },
    [stopActivity, stopTimer]
  );

  const startActivity = async (activityId: string) => {
    const { newActivity, success, message } = await startActivityById(
      activityId
    );
    if (success && newActivity) {
      setCurrentActivity(newActivity as Activity);
      // startTimer(newActivity.startTime); // this happens in useeffect upon currentActivity change
      toast({
        variant: "success",
        description: "Activity started successfully",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
  };

  const fetchActiveActivity = useCallback(async () => {
    const { activity, success } = await getCurrentActivity();
    if (success && activity) {
      setCurrentActivity(activity);
      startTimer(activity.startTime.getTime());
    }
  }, [startTimer]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadActivities(1, recordsPerPage), fetchActiveActivity()]);
    };
    init();
    return () => {
      stopTimer(); // Cleanup the timer on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsPerPage]);

  useEffect(() => {
    if (currentActivity) {
      startTimer(currentActivity.startTime.getTime());
    }
  }, [currentActivity, startTimer]);

  // Debounced search effect
  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadActivities(1, recordsPerPage, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <CardTitle>Activities</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search activities..."
              className="pl-8 h-8 w-[150px] lg:w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={activityFormOpen} onOpenChange={setActivityFormOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              data-testid="add-activity-btn"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Activity
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <ActivityForm
                onClose={closeActivityForm}
                reloadActivities={reloadActivities}
              />
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <Loading />}
        {currentActivity && (
          <ActivityBanner
            message={`${
              (currentActivity.activityType as ActivityType)?.label
            } - ${currentActivity.activityName}`}
            onStopActivity={stopActivity}
            elapsedTime={timeElapsed}
          />
        )}
        {activitiesList.length > 0 && (
          <>
            <ActivitiesTable
              activities={activitiesList}
              reloadActivities={reloadActivities}
              onStartActivity={startActivity}
              activityExist={Boolean(currentActivity)}
            />
            <div className="flex items-center justify-between mt-4">
              <RecordsCount
                count={activitiesList.length}
                total={totalActivities}
                label="activities"
              />
              {totalActivities > APP_CONSTANTS.RECORDS_PER_PAGE && (
                <RecordsPerPageSelector
                  value={recordsPerPage}
                  onChange={setRecordsPerPage}
                />
              )}
            </div>
          </>
        )}
        {activitiesList.length < totalActivities && (
          <div className="flex justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadActivities(page + 1, recordsPerPage, searchTerm || undefined)}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivitiesContainer;
