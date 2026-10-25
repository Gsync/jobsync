"use client";
import { useEffect, useState } from "react";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import { Button } from "../../ui/button";
import { CardTitle } from "../../ui/card";
import { ResponsiveCardHeader } from "../../ResponsiveCardHeader";
import { SearchInput } from "../../SearchInput";
import { RecordsCount } from "../../RecordsCount";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { TaskGroupBy, TaskStatus, TASK_STATUSES } from "@/models/task.model";

const GROUP_BY_OPTIONS: Record<TaskGroupBy, string> = {
  none: "None",
  createdDate: "Created Date",
  dueDate: "Due Date",
  updatedDate: "Updated Date",
  activityType: "Activity Type",
};

// Presentational: the Tasks card header — title/count, search, the combined
// status filter + group-by menu, and New Task.
export function TasksToolbar({
  tasksCount,
  totalTasks,
  initialLoading,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onToggleStatusFilter,
  groupBy,
  onGroupByChange,
  onAddTask,
}: {
  tasksCount: number;
  totalTasks: number;
  initialLoading: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: TaskStatus[];
  onToggleStatusFilter: (status: TaskStatus) => void;
  groupBy: TaskGroupBy;
  onGroupByChange: (value: string) => void;
  onAddTask: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch with Radix UI components
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ResponsiveCardHeader>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <CardTitle>Tasks</CardTitle>
        {!initialLoading && totalTasks > 0 && (
          <RecordsCount count={tasksCount} total={totalTasks} label="tasks" />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
        <SearchInput
          value={searchTerm}
          onChange={onSearchTermChange}
          placeholder="Search tasks..."
        />
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="Filter tasks"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(TASK_STATUSES) as TaskStatus[]).map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={() => onToggleStatusFilter(status)}
                >
                  {TASK_STATUSES[status]}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Group by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={groupBy}
                onValueChange={onGroupByChange}
              >
                {(Object.keys(GROUP_BY_OPTIONS) as TaskGroupBy[]).map(
                  (value) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {GROUP_BY_OPTIONS[value]}
                    </DropdownMenuRadioItem>
                  ),
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Filter tasks"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={onAddTask}
          data-testid="add-task-btn"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            New Task
          </span>
        </Button>
      </div>
    </ResponsiveCardHeader>
  );
}
