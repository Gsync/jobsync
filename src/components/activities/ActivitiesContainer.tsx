"use client";
import ActivitiesTable from "./ActivitiesTable";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
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

function ActivitiesContainer() {
  const [activityFormOpen, setActivityFormOpen] = useState<boolean>(false);
  const [activitiesList, setActivitiesList] = useState<Activity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<Activity>();
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalActivities, setTotalActivities] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const closeActivityForm = () => setActivityFormOpen(false);

  const loadActivities = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const { data, success, message, total } = await getActivitiesList(page);
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
  }, []);
  const reloadActivities = useCallback(async () => {
    await loadActivities(1);
  }, [loadActivities]);

  const fetchActiveActivity = useCallback(async () => {
    const { activity, success } = await getCurrentActivity();
    if (success && activity) {
      setCurrentActivity(activity);
      startTimer(activity.startTime);
    }
  }, []);

  useEffect(() => {
    loadActivities(1);
    fetchActiveActivity();
    return () => {
      stopTimer(); // Cleanup the timer on unmount
    };
  }, [loadActivities, fetchActiveActivity]);

  const startTimer = (startTime: number) => {
    // TODO: Check and validate the following at the change of date
    // ALSO: Stop activity when max duration is reached, i.e. 8 hours
    const initialElapsed = Date.now() - startTime;
    setTimeElapsed(initialElapsed);

    // Clear any existing timer to avoid duplicates
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start the interval timer
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1000);
    }, 1000);
  };

  const stopTimer = () => {
    // Clear the timer and reset elapsed time
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeElapsed(0);
  };

  const startActivity = async (activityId: string) => {
    const { newActivity, success, message } = await startActivityById(
      activityId
    );
    if (success) {
      setCurrentActivity(newActivity);
      startTimer(newActivity.startTime);
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

  const stopActivity = async () => {
    if (!currentActivity) return;
    const now = new Date();
    const duration = differenceInMinutes(now, currentActivity.startTime);
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
        description: "Activity stopped successfully",
      });
    } else {
      toast({ variant: "destructive", title: "Error!", description: message });
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center">
        <CardTitle>Activities</CardTitle>
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
        <ActivitiesTable
          activities={activitiesList}
          reloadActivities={reloadActivities}
          onStartActivity={startActivity}
          activityExist={Boolean(currentActivity)}
        />
        {activitiesList.length < totalActivities && (
          <div className="flex justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadActivities(page + 1)}
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
