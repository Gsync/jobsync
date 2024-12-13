"use client";
import { CirclePlay, MoreHorizontal, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button, buttonVariants } from "../ui/button";
import { format } from "date-fns";
import { Activity, ActivityType } from "@/models/activity.model";
import { deleteActivityById } from "@/actions/activity.actions";
import { toast } from "../ui/use-toast";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface ActivitiesTableProps {
  activities: Activity[];
  reloadActivities: () => void;
  onStartActivity: (activityId: string) => void;
}

function ActivitiesTable({
  activities,
  reloadActivities,
  onStartActivity,
}: ActivitiesTableProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [activityIdToDelete, setActivityIdToDelete] = useState<string>();
  const calculateDuration = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return totalMinutes === 0 ? "" : `${hours}h ${minutes}min`;
  };

  const onDeleteActivity = useMemo(
    () => (id: string) => {
      setAlertOpen(true);
      setActivityIdToDelete(id);
    },
    []
  );

  const deleteActivity = async (activityId: string) => {
    const { success, message } = await deleteActivityById(activityId);
    if (success) {
      toast({
        variant: "success",
        description: `Activity has been deleted successfully`,
      });
      reloadActivities();
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
  };
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead className="hidden md:table-cell">
              Activity Type
            </TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead className="hidden md:table-cell">Duration</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities?.map((activity: Activity) => {
            return (
              <TableRow key={activity.id} className="cursor-pointer">
                <TableCell className="hidden md:table-cell w-[120px]">
                  {activity.startTime
                    ? format(activity.startTime, "PP")
                    : "N/A"}
                </TableCell>
                <TableCell className="font-medium">
                  {activity.activityName}
                </TableCell>
                <TableCell className="font-medium">
                  {(activity.activityType as ActivityType)?.label}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {format(activity.startTime, "p")}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {format(activity.endTime!, "p")}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {activity.startTime &&
                    activity.endTime &&
                    calculateDuration(activity.duration ?? 0)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          className="cursor-pointer text-green-400"
                          onClick={() => onStartActivity(activity.id!)}
                        >
                          <CirclePlay className="mr-2 h-4 w-4" />
                          Start Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 cursor-pointer"
                          onClick={() => onDeleteActivity(activity.id!)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this activity?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete and
              remove data from server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => deleteActivity(activityIdToDelete!)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ActivitiesTable;
