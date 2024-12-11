"use client";
import ActivitiesTable from "./ActivitiesTable";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ActivityForm } from "./ActivityForm";
import { getActivitiesList } from "@/actions/activity.actions";
import { Activity } from "@/models/activity.model";
import { toast } from "../ui/use-toast";
import Loading from "../Loading";

function ActivitiesContainer() {
  const [activityFormOpen, setActivityFormOpen] = useState<boolean>(false);
  const [activitiesList, setActivitiesList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, success, message } = await getActivitiesList();
      if (success) {
        setActivitiesList(data);
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
    await loadActivities();
  }, [loadActivities]);
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);
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
          <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
            </DialogHeader>
            <ActivityForm
              onClose={() => setActivityFormOpen(false)}
              reloadActivities={reloadActivities}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading && <Loading />}
        <ActivitiesTable
          activities={activitiesList}
          reloadActivities={reloadActivities}
        />
      </CardContent>
    </Card>
  );
}

export default ActivitiesContainer;
