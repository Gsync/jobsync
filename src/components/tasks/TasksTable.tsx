"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  MoreHorizontal,
  Pencil,
  Tags,
  Trash,
  CirclePlay,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { format, isToday, isTomorrow, isPast, isThisWeek } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { useState } from "react";
import { Task, TASK_STATUSES, TaskStatus } from "@/models/task.model";
import { DeleteAlertDialog } from "../DeleteAlertDialog";

type TasksTableProps = {
  tasks: Task[];
  deleteTask: (id: string) => void;
  editTask: (id: string) => void;
  onChangeTaskStatus: (id: string, status: TaskStatus) => void;
  onStartActivity: (id: string) => void;
  groupBy?: "none" | "createdDate" | "dueDate" | "updatedDate" | "activityType";
};

const statusColors: Record<TaskStatus, string> = {
  "in-progress": "bg-blue-500",
  complete: "bg-green-500",
  "needs-attention": "bg-orange-500",
  cancelled: "bg-gray-500",
};

type DateGroup =
  | "Overdue"
  | "Today"
  | "Tomorrow"
  | "This Week"
  | "Later"
  | "No Due Date";

type CreatedDateGroup = string; // Format: "YYYY-MM-DD"
type UpdatedDateGroup = string; // Format: "YYYY-MM-DD"

function getDateGroup(dueDate: Date | null | undefined): DateGroup {
  if (!dueDate) return "No Due Date";
  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) return "Overdue";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isThisWeek(date)) return "This Week";
  return "Later";
}

function groupTasksByDate(tasks: Task[]): Record<DateGroup, Task[]> {
  const groups: Record<DateGroup, Task[]> = {
    Overdue: [],
    Today: [],
    Tomorrow: [],
    "This Week": [],
    Later: [],
    "No Due Date": [],
  };

  tasks.forEach((task) => {
    const group = getDateGroup(task.dueDate);
    groups[group].push(task);
  });

  return groups;
}

function groupTasksByActivityType(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};

  tasks.forEach((task) => {
    const key = task.activityType?.label || "No Activity Type";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
  });

  return groups;
}

function groupTasksByCreatedDate(
  tasks: Task[],
): Record<CreatedDateGroup, Task[]> {
  const groups: Record<CreatedDateGroup, Task[]> = {};

  tasks.forEach((task) => {
    const dateStr = format(new Date(task.createdAt), "yyyy-MM-dd");
    const key = dateStr;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
  });

  return groups;
}

function groupTasksByUpdatedDate(
  tasks: Task[],
): Record<UpdatedDateGroup, Task[]> {
  const groups: Record<UpdatedDateGroup, Task[]> = {};

  tasks.forEach((task) => {
    const dateStr = format(new Date(task.updatedAt), "yyyy-MM-dd");
    const key = dateStr;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
  });

  return groups;
}

function TasksTable({
  tasks,
  deleteTask,
  editTask,
  onChangeTaskStatus,
  onStartActivity,
  groupBy = "none",
}: TasksTableProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState("");

  const onDeleteTask = (taskId: string) => {
    setAlertOpen(true);
    setTaskIdToDelete(taskId);
  };

  const renderTaskRow = (task: Task) => (
    <TableRow
      key={task.id}
      className={cn(
        "group relative h-9",
        task.status === "complete" && "opacity-60",
      )}
    >
      <TableCell className="w-[24px] py-1 pl-1 pr-1">
        <button
          onClick={() =>
            onChangeTaskStatus(
              task.id,
              task.status === "complete" ? "in-progress" : "complete",
            )
          }
          className={cn(
            "h-5 w-5 rounded border flex items-center justify-center transition-colors",
            task.status === "complete"
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 hover:border-gray-400",
          )}
          aria-label={
            task.status === "complete"
              ? "Mark as in progress"
              : "Mark as complete"
          }
        >
          {task.status === "complete" && <Check className="h-3 w-3" />}
        </button>
      </TableCell>
      <TableCell
        className={cn(
          "py-1 px-2 font-medium",
          task.status === "complete" && "line-through",
        )}
      >
        <button
          onClick={() => editTask(task.id)}
          className="text-left hover:underline cursor-pointer"
          aria-label={`Edit ${task.title}`}
        >
          {task.title}
        </button>
      </TableCell>
      <TableCell className="py-1 px-2">
        {task.activityType?.label || "—"}
      </TableCell>
      <TableCell className="hidden md:table-cell py-1 px-2">
        <Badge
          className={cn(
            "min-w-[120px] whitespace-nowrap justify-center",
            statusColors[task.status],
          )}
        >
          {TASK_STATUSES[task.status]}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell py-1 px-2 text-center">
        {task.priority}
      </TableCell>
      <TableCell className="hidden md:table-cell py-1 px-2 text-center">
        {task.percentComplete}%
      </TableCell>
      <TableCell className="py-1 px-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-haspopup="true"
              size="icon"
              variant="ghost"
              data-testid="task-actions-menu-btn"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => editTask(task.id)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tags className="mr-2 h-4 w-4" />
                  Change Status
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="p-0">
                    {(Object.keys(TASK_STATUSES) as TaskStatus[]).map(
                      (status) => (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          key={status}
                          onSelect={() => onChangeTaskStatus(task.id, status)}
                          disabled={status === task.status}
                        >
                          <span>{TASK_STATUSES[status]}</span>
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-green-600"
                onClick={() => onStartActivity(task.id)}
                disabled={!!task.activity}
              >
                <CirclePlay className="mr-2 h-4 w-4" />
                Start Activity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => onDeleteTask(task.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell className="py-1 px-1">
        {!task.activity && (
          <Button
            title="Start Activity"
            aria-haspopup="true"
            size="icon"
            variant="ghost"
            onClick={() => onStartActivity(task.id)}
            data-testid="task-start-activity-btn"
            className="opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300"
          >
            <span>
              <CirclePlay className="text-green-600" />
            </span>
          </Button>
        )}
      </TableCell>
    </TableRow>
  );

  const renderTableHeader = () => (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[24px] h-9 px-1">
          <span className="sr-only">Complete</span>
        </TableHead>
        <TableHead className="h-9 px-2">Title</TableHead>
        <TableHead className="h-9 px-2">Activity Type</TableHead>
        <TableHead className="hidden md:table-cell h-9 px-2">Status</TableHead>
        <TableHead className="hidden md:table-cell h-9 px-2 text-center">
          Priority
        </TableHead>
        <TableHead className="hidden md:table-cell h-9 px-2 text-center">
          % Complete
        </TableHead>
        <TableHead className="h-9 px-1">
          <span className="sr-only">Actions</span>
        </TableHead>
        <TableHead className="h-9 px-1">
          <span className="sr-only">Start Activity</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks found. Create your first task to get started.
      </div>
    );
  }

  if (groupBy === "dueDate") {
    const groupedTasks = groupTasksByDate(tasks);
    const groupOrder: DateGroup[] = [
      "Overdue",
      "Today",
      "Tomorrow",
      "This Week",
      "Later",
      "No Due Date",
    ];

    return (
      <>
        {groupOrder.map((group) => {
          const groupTasks = groupedTasks[group];
          if (groupTasks.length === 0) return null;

          return (
            <div key={group} className="mb-6">
              <h3
                className={cn(
                  "text-sm font-semibold mb-2 px-2 py-1",
                  group === "Overdue",
                  group === "Today",
                  group === "Tomorrow",
                )}
              >
                {group} ({groupTasks.length})
              </h3>
              <Table>
                {renderTableHeader()}
                <TableBody>{groupTasks.map(renderTaskRow)}</TableBody>
              </Table>
            </div>
          );
        })}
        <DeleteAlertDialog
          pageTitle="task"
          open={alertOpen}
          onOpenChange={setAlertOpen}
          onDelete={() => deleteTask(taskIdToDelete)}
        />
      </>
    );
  }

  if (groupBy === "activityType") {
    const groupedTasks = groupTasksByActivityType(tasks);

    return (
      <>
        {Object.entries(groupedTasks).map(([activityType, groupTasks]) => (
          <div key={activityType} className="mb-6">
            <h3 className="text-sm font-semibold mb-2 px-2 py-1">
              {activityType} ({groupTasks.length})
            </h3>
            <Table>
              {renderTableHeader()}
              <TableBody>{groupTasks.map(renderTaskRow)}</TableBody>
            </Table>
          </div>
        ))}
        <DeleteAlertDialog
          pageTitle="task"
          open={alertOpen}
          onOpenChange={setAlertOpen}
          onDelete={() => deleteTask(taskIdToDelete)}
        />
      </>
    );
  }

  if (groupBy === "createdDate") {
    const groupedTasks = groupTasksByCreatedDate(tasks);
    const sortedDates = Object.keys(groupedTasks).sort().reverse();

    return (
      <>
        {sortedDates.map((dateStr) => {
          const groupTasks = groupedTasks[dateStr];
          const displayDate = format(new Date(dateStr), "MMM d, yyyy");

          return (
            <div key={dateStr} className="mb-6">
              <h3 className="text-sm font-semibold mb-2 px-2 py-1">
                {displayDate} ({groupTasks.length})
              </h3>
              <Table>
                {renderTableHeader()}
                <TableBody>{groupTasks.map(renderTaskRow)}</TableBody>
              </Table>
            </div>
          );
        })}
        <DeleteAlertDialog
          pageTitle="task"
          open={alertOpen}
          onOpenChange={setAlertOpen}
          onDelete={() => deleteTask(taskIdToDelete)}
        />
      </>
    );
  }

  if (groupBy === "updatedDate") {
    const groupedTasks = groupTasksByUpdatedDate(tasks);
    const sortedDates = Object.keys(groupedTasks).sort().reverse();

    return (
      <>
        {sortedDates.map((dateStr) => {
          const groupTasks = groupedTasks[dateStr];
          const displayDate = format(new Date(dateStr), "MMM d, yyyy");

          return (
            <div key={dateStr} className="mb-6">
              <h3 className="text-sm font-semibold mb-2 px-2 py-1">
                {displayDate} ({groupTasks.length})
              </h3>
              <Table>
                {renderTableHeader()}
                <TableBody>{groupTasks.map(renderTaskRow)}</TableBody>
              </Table>
            </div>
          );
        })}
        <DeleteAlertDialog
          pageTitle="task"
          open={alertOpen}
          onOpenChange={setAlertOpen}
          onDelete={() => deleteTask(taskIdToDelete)}
        />
      </>
    );
  }

  return (
    <>
      <Table>
        {renderTableHeader()}
        <TableBody>{tasks.map(renderTaskRow)}</TableBody>
      </Table>
      <DeleteAlertDialog
        pageTitle="task"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteTask(taskIdToDelete)}
      />
    </>
  );
}

export default TasksTable;
