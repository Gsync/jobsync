"use client";
import { cn } from "@/lib/utils";

type ActivityTypeWithCount = {
  id: string;
  label: string;
  value: string;
  taskCount: number;
};

type TasksSidebarProps = {
  activityTypes: ActivityTypeWithCount[];
  totalTasks: number;
  selectedFilter?: string;
  onFilterChange: (filter: string | undefined) => void;
};

function TasksSidebar({
  activityTypes,
  totalTasks,
  selectedFilter,
  onFilterChange,
}: TasksSidebarProps) {
  return (
    <div className="w-48 border-r py-4 hidden md:block h-full">
      <h3 className="font-semibold mb-4 text-sm">Activity Types</h3>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onFilterChange(undefined)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              !selectedFilter && "bg-accent text-accent-foreground font-medium"
            )}
          >
            <span className="flex justify-between items-center">
              <span>All</span>
              <span className="text-muted-foreground text-xs">
                {totalTasks}
              </span>
            </span>
          </button>
        </li>
        {activityTypes.map((type) => (
          <li key={type.id}>
            <button
              onClick={() => onFilterChange(type.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                selectedFilter === type.id &&
                  "bg-accent text-accent-foreground font-medium"
              )}
            >
              <span className="flex justify-between items-center">
                <span className="truncate">{type.label}</span>
                <span className="text-muted-foreground text-xs">
                  {type.taskCount}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TasksSidebar;
