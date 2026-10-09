"use client";
import { useState } from "react";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Loader } from "lucide-react";
import {
  deleteTaskById,
  getTaskById,
  startActivityFromTask,
} from "@/actions/task.actions";
import { toastActionResult, toastError } from "@/lib/toast";
import { Task } from "@/models/task.model";
import ListSkeleton from "@/components/ListSkeleton";
import TasksTable from "./TasksTable";
import { TaskForm } from "./TaskForm";
import { ActivityType } from "@/models/activity.model";
import { useActivity } from "@/context/ActivityContext";
import { useActivitySwitchConfirm } from "@/hooks/useActivitySwitchConfirm";
import { useTasksList } from "./tasks-container/useTasksList";
import { useAutoOpenAddTaskDialog } from "./tasks-container/useAutoOpenAddTaskDialog";
import { TasksToolbar } from "./tasks-container/TasksToolbar";

type TasksContainerProps = {
  activityTypes: ActivityType[];
  filterKey?: string;
  onTasksChanged?: () => void;
};

function TasksContainer({
  activityTypes,
  filterKey,
  onTasksChanged,
}: TasksContainerProps) {
  const { refreshCurrentActivity } = useActivity();
  const { requestStart, confirmDialog } = useActivitySwitchConfirm();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    tasks,
    totalTasks,
    initialLoading,
    loadingMore,
    groupBy,
    onGroupByChange,
    statusFilter,
    toggleStatusFilter,
    searchTerm,
    setSearchTerm,
    sentinelRef,
    reloadTasks,
    onChangeTaskStatus,
  } = useTasksList({ filterKey, onTasksChanged });

  useAutoOpenAddTaskDialog(setDialogOpen);

  const onDeleteTask = async (taskId: string) => {
    const result = await deleteTaskById(taskId);
    toastActionResult(result, {
      success: "Task has been deleted successfully",
      onSuccess: () => reloadTasks(),
    });
  };

  const onEditTask = async (taskId: string) => {
    const { data, success, message } = await getTaskById(taskId);
    if (!success) {
      toastError(message);
      return;
    }
    setEditTask(data);
    setDialogOpen(true);
  };

  const addTaskForm = () => {
    resetEditTask();
    setDialogOpen(true);
  };

  const onStartActivity = (taskId: string) => {
    requestStart(async () => {
      const result = await startActivityFromTask(taskId);
      toastActionResult(result, {
        success: "Activity started from task",
        onSuccess: () => refreshCurrentActivity(),
      });
      return result.success;
    });
  };

  const resetEditTask = () => {
    setEditTask(null);
  };

  return (
    <>
      <Card x-chunk="dashboard-tasks-chunk-0" className="h-full">
        <TasksToolbar
          tasksCount={tasks.length}
          totalTasks={totalTasks}
          initialLoading={initialLoading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFilter={statusFilter}
          onToggleStatusFilter={toggleStatusFilter}
          groupBy={groupBy}
          onGroupByChange={onGroupByChange}
          onAddTask={addTaskForm}
        />
        <CardContent>
          {initialLoading && <ListSkeleton />}
          {!initialLoading && tasks.length > 0 && (
            <>
              <TasksTable
                tasks={tasks}
                deleteTask={onDeleteTask}
                editTask={onEditTask}
                onChangeTaskStatus={onChangeTaskStatus}
                onStartActivity={onStartActivity}
                groupBy={groupBy}
              />
            </>
          )}
          {!initialLoading && tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found. Create your first task to get started.
            </div>
          )}
          {tasks.length < totalTasks && (
            <div ref={sentinelRef} className="flex justify-center p-4">
              {loadingMore && (
                <Loader className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
          )}
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
      <TaskForm
        activityTypes={activityTypes}
        editTask={editTask}
        resetEditTask={resetEditTask}
        onTaskSaved={reloadTasks}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        onSaveAndStart={onStartActivity}
      />
      {confirmDialog}
    </>
  );
}

export default TasksContainer;
export type { TasksContainerProps };
