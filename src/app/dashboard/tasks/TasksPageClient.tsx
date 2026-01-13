"use client";
import TasksContainer from "@/components/tasks/TasksContainer";
import TasksSidebar from "@/components/tasks/TasksSidebar";
import { ActivityType } from "@/models/activity.model";
import { useState } from "react";

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

  const onFilterChange = (filter: string | undefined) => {
    setFilterKey(filter);
  };

  return (
    <div className="col-span-3 flex">
      <TasksSidebar
        activityTypes={activityTypesWithCounts}
        totalTasks={totalTasks}
        selectedFilter={filterKey}
        onFilterChange={onFilterChange}
      />
      <div className="flex-1">
        <TasksContainer
          activityTypes={activityTypes}
          filterKey={filterKey}
          onFilterChange={onFilterChange}
        />
      </div>
    </div>
  );
}

export default TasksPageClient;
