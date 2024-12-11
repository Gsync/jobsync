import { MoreHorizontal, Pencil, Trash } from "lucide-react";
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
import { Button } from "../ui/button";
import { differenceInMinutes, format } from "date-fns";
import { Activity, ActivityType } from "@/models/activity.model";

interface ActivitiesTableProps {
  activities: Activity[];
}

function ActivitiesTable({ activities }: ActivitiesTableProps) {
  const calculateDuration = (start: Date, end: Date) => {
    const totalMinutes = differenceInMinutes(end, start);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}min`;
  };
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden md:table-cell">Date</TableHead>
          <TableHead>Activity</TableHead>
          <TableHead className="hidden md:table-cell">Activity Type</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>End Time</TableHead>
          <TableHead className="hidden md:table-cell">Duration</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity: Activity) => {
          return (
            <TableRow key={activity.id} className="cursor-pointer">
              <TableCell className="hidden md:table-cell w-[120px]">
                {activity.startTime ? format(activity.startTime, "PP") : "N/A"}
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
                  calculateDuration(activity.startTime, activity.endTime!)}
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
                      <DropdownMenuItem className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Activity
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 cursor-pointer">
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
  );
}

export default ActivitiesTable;
