"use client";
import TasksContainer from "@/components/tasks/TasksContainer";
import TasksSidebar from "@/components/tasks/TasksSidebar";
import { ActivityType } from "@/models/activity.model";
import { useState, useCallback } from "react";
import { getActivityTypesWithTaskCounts } from "@/actions/task.actions";

type ActivityTypeWithCount = {
  id: string;
  label: string;
  value: string;
  taskCount: number;
};

type TasksPageClientProps = {
  activityTypes: ActivityType[];
  activityTypesWithCounts: ActivityTypeWithCount[];
  totalTasks: number;
};

function TasksPageClient({
  activityTypes,
  activityTypesWithCounts,
  totalTasks,
}: TasksPageClientProps) {
  const [filterKey, setFilterKey] = useState<string | undefined>(undefined);
  const [sidebarCounts, setSidebarCounts] =
    useState<ActivityTypeWithCount[]>(activityTypesWithCounts);
  const [sidebarTotal, setSidebarTotal] = useState<number>(totalTasks);

  const onFilterChange = (filter: string | undefined) => {
    setFilterKey(filter);
  };

  const refreshSidebarCounts = useCallback(async () => {
    const result = await getActivityTypesWithTaskCounts();
    if (result?.success) {
      setSidebarCounts(result.data);
      setSidebarTotal(result.totalTasks);
    }
  }, []);

  return (
    <div className="col-span-3 flex h-full">
      <TasksSidebar
        activityTypes={sidebarCounts}
        totalTasks={sidebarTotal}
        selectedFilter={filterKey}
        onFilterChange={onFilterChange}
      />
      <div className="flex-1">
        <TasksContainer
          activityTypes={activityTypes}
          filterKey={filterKey}
          onFilterChange={onFilterChange}
          onTasksChanged={refreshSidebarCounts}
        />
      </div>
    </div>
  );
}

export default TasksPageClient;
