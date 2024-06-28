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
import { activitiesData } from "@/lib/data/activitiesData";
import { differenceInMinutes, format, fromUnixTime } from "date-fns";

function ActivitiesTable() {
  const activities: any = activitiesData;
  const calculateDuration = (start: number, end: number) => {
    // Convert Unix timestamps to JavaScript Date objects
    const startDate = fromUnixTime(start);
    const endDate = fromUnixTime(end);
    // Calculate the difference in minutes
    const totalMinutes = differenceInMinutes(endDate, startDate);

    // Convert total minutes to hours and remaining minutes
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
        {activities.map((activity: any) => {
          return (
            <TableRow key={activity.id} className="cursor-pointer">
              <TableCell className="hidden md:table-cell w-[120px]">
                {activity.startDateTime
                  ? format(fromUnixTime(activity.startDateTime), "PP")
                  : "N/A"}
              </TableCell>
              <TableCell className="font-medium">
                {activity.activityName}
              </TableCell>
              <TableCell className="font-medium">
                {activity.activityType}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {format(fromUnixTime(activity.startDateTime), "p")}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {format(fromUnixTime(activity.endDateTime), "p")}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {calculateDuration(
                  activity.startDateTime,
                  activity.endDateTime
                )}
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
