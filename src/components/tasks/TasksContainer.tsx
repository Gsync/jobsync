"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { ListFilter, PlusCircle, Filter, Search } from "lucide-react";
import { Input } from "../ui/input";
import {
  deleteTaskById,
  getTaskById,
  getTasksList,
  updateTaskStatus,
  startActivityFromTask,
} from "@/actions/task.actions";
import { toast } from "../ui/use-toast";
import { Task, TaskStatus, TASK_STATUSES } from "@/models/task.model";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import TasksTable from "./TasksTable";
import { TaskForm } from "./TaskForm";
import { ActivityType } from "@/models/activity.model";
import { useActivity } from "@/context/ActivityContext";

type TasksContainerProps = {
  activityTypes: ActivityType[];
  filterKey?: string;
  onFilterChange?: (filter: string | undefined) => void;
  onTasksChanged?: () => void;
};

const DEFAULT_STATUS_FILTER: TaskStatus[] = ["in-progress", "needs-attention"];

function TasksContainer({
  activityTypes,
  filterKey,
  onFilterChange,
  onTasksChanged,
}: TasksContainerProps) {
  const { refreshCurrentActivity } = useActivity();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [page, setPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<
    "none" | "createdDate" | "dueDate" | "updatedDate" | "activityType"
  >("none");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>(
    DEFAULT_STATUS_FILTER,
  );
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const hasSearched = useRef(false);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch with Radix UI components
  useEffect(() => {
    setMounted(true);
  }, []);

  const tasksPerPage = recordsPerPage;

  const loadTasks = useCallback(
    async (pageNum: number, filter?: string, statuses?: TaskStatus[], search?: string) => {
      setLoading(true);
      const { success, data, total, message } = await getTasksList(
        pageNum,
        tasksPerPage,
        filter,
        statuses,
        search,
      );
      if (success && data) {
        setTasks((prev) => (pageNum === 1 ? data : [...prev, ...data]));
        setTotalTasks(total);
        setPage(pageNum);
        setLoading(false);
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
        setLoading(false);
      }
    },
    [tasksPerPage],
  );

  const reloadTasks = useCallback(async () => {
    await loadTasks(1, filterKey, statusFilter, searchTerm || undefined);
    onTasksChanged?.();
  }, [loadTasks, filterKey, statusFilter, searchTerm, onTasksChanged]);

  const onDeleteTask = async (taskId: string) => {
    const { success, message } = await deleteTaskById(taskId);
    if (success) {
      toast({
        variant: "success",
        description: "Task has been deleted successfully",
      });
      reloadTasks();
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
  };

  const onEditTask = async (taskId: string) => {
    const { data, success, message } = await getTaskById(taskId);
    if (!success) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
      return;
    }
    setEditTask(data);
    setDialogOpen(true);
  };

  const addTaskForm = () => {
    resetEditTask();
    setDialogOpen(true);
  };

  const onChangeTaskStatus = async (taskId: string, status: TaskStatus) => {
    const originalTasks = [...tasks];
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );

    const { success, message } = await updateTaskStatus(taskId, status);
    if (success) {
      toast({
        variant: "success",
        description: "Task status updated successfully",
      });
      onTasksChanged?.();
    } else {
      setTasks(originalTasks);
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
  };

  const onStartActivity = async (taskId: string) => {
    const { success, message } = await startActivityFromTask(taskId);
    if (success) {
      await refreshCurrentActivity();
      toast({
        variant: "success",
        description: "Activity started from task",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
  };

  const resetEditTask = () => {
    setEditTask(null);
  };

  useEffect(() => {
    (async () => await loadTasks(1, filterKey, statusFilter, searchTerm || undefined))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTasks, filterKey, statusFilter, recordsPerPage]);

  // Debounced search effect
  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadTasks(1, filterKey, statusFilter, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const onGroupByChange = (value: string) => {
    setGroupBy(
      value as
        | "none"
        | "createdDate"
        | "dueDate"
        | "updatedDate"
        | "activityType",
    );
  };

  const toggleStatusFilter = (status: TaskStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  return (
    <>
      <Card x-chunk="dashboard-tasks-chunk-0" className="h-full">
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>My Tasks</CardTitle>
          <div className="flex items-center">
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tasks..."
                  className="pl-8 h-8 w-[150px] lg:w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {mounted ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <Filter className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Status
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(Object.keys(TASK_STATUSES) as TaskStatus[]).map(
                      (status) => (
                        <DropdownMenuCheckboxItem
                          key={status}
                          checked={statusFilter.includes(status)}
                          onCheckedChange={() => toggleStatusFilter(status)}
                        >
                          {TASK_STATUSES[status]}
                        </DropdownMenuCheckboxItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Status
                  </span>
                </Button>
              )}
              {mounted ? (
                <Select value={groupBy} onValueChange={onGroupByChange}>
                  <SelectTrigger className="w-[140px] h-8">
                    <ListFilter className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Group by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Group by</SelectLabel>
                      <SelectSeparator />
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="createdDate">Created Date</SelectItem>
                      <SelectItem value="dueDate">Due Date</SelectItem>
                      <SelectItem value="updatedDate">Updated Date</SelectItem>
                      <SelectItem value="activityType">Activity Type</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" size="sm" className="h-8 gap-1 w-[140px]">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>Group by</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={addTaskForm}
                data-testid="add-task-btn"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Task
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <Loading />}
          {!loading && tasks.length > 0 && (
            <>
              <TasksTable
                tasks={tasks}
                deleteTask={onDeleteTask}
                editTask={onEditTask}
                onChangeTaskStatus={onChangeTaskStatus}
                onStartActivity={onStartActivity}
                groupBy={groupBy}
              />
              <div className="flex items-center justify-between mt-4">
                <RecordsCount
                  count={tasks.length}
                  total={totalTasks}
                  label="tasks"
                />
                {totalTasks > APP_CONSTANTS.RECORDS_PER_PAGE && (
                  <RecordsPerPageSelector
                    value={recordsPerPage}
                    onChange={setRecordsPerPage}
                  />
                )}
              </div>
            </>
          )}
          {!loading && tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found. Create your first task to get started.
            </div>
          )}
          {tasks.length < totalTasks && (
            <div className="flex justify-center p-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadTasks(page + 1, filterKey, statusFilter, searchTerm || undefined)}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
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
      />
    </>
  );
}

export default TasksContainer;
export type { TasksContainerProps };
