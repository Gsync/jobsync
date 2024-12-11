"use client";
import ActivitiesTable from "./ActivitiesTable";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ActivityForm } from "./ActivityForm";
import { activitiesData } from "@/lib/data/activitiesData";
import { getActivitiesList } from "@/actions/activity.actions";
import { Activity } from "@/models/activity.model";
import { set } from "date-fns";

function ActivitiesContainer() {
  const [activityFormOpen, setActivityFormOpen] = useState<boolean>(false);
  const [activitiesList, setActivitiesList] = useState<Activity[]>([]);
  const loadActivities = async () => {
    const response = await getActivitiesList();
    setActivitiesList(response.data);
  };
  useEffect(() => {
    loadActivities();
  }, []);
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
            <ActivityForm onClose={() => setActivityFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <ActivitiesTable activities={activitiesList} />
      </CardContent>
    </Card>
  );
}

export default ActivitiesContainer;
