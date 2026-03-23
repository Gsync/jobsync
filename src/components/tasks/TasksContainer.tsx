"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useTranslations } from "@/i18n/use-translations";

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
  const { t } = useTranslations();
  const router = useRouter();
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
    async (
      pageNum: number,
      filter?: string,
      statuses?: TaskStatus[],
      search?: string,
    ) => {
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
          title: t("tasks.error"),
          description: message,
        });
        setLoading(false);
      }
    },
    [tasksPerPage, t],
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
        description: t("tasks.deletedSuccess"),
      });
      reloadTasks();
    } else {
      toast({
        variant: "destructive",
        title: t("tasks.error"),
        description: message,
      });
    }
  };

  const onEditTask = async (taskId: string) => {
    const { data, success, message } = await getTaskById(taskId);
    if (!success) {
      toast({
        variant: "destructive",
        title: t("tasks.error"),
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
        description: t("tasks.statusUpdated"),
      });
      onTasksChanged?.();
    } else {
      setTasks(originalTasks);
      toast({
        variant: "destructive",
        title: t("tasks.error"),
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
        description: t("tasks.activityStarted"),
      });
      router.push("/dashboard/activities");
    } else {
      toast({
        variant: "destructive",
        title: t("tasks.error"),
        description: message,
      });
    }
  };

  const resetEditTask = () => {
    setEditTask(null);
  };

  useEffect(() => {
    (async () =>
      await loadTasks(1, filterKey, statusFilter, searchTerm || undefined))();
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
          <CardTitle>{t("tasks.title")}</CardTitle>
          <div className="flex items-center">
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("tasks.searchPlaceholder")}
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
                        {t("tasks.status")}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("tasks.filterByStatus")}</DropdownMenuLabel>
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
                    {t("tasks.status")}
                  </span>
                </Button>
              )}
              {mounted ? (
                <Select value={groupBy} onValueChange={onGroupByChange}>
                  <SelectTrigger className="w-[140px] h-8">
                    <ListFilter className="h-3.5 w-3.5" />
                    <SelectValue placeholder={t("tasks.groupBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{t("tasks.groupBy")}</SelectLabel>
                      <SelectSeparator />
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="createdDate">{t("tasks.createdDate")}</SelectItem>
                      <SelectItem value="dueDate">{t("tasks.dueDate")}</SelectItem>
                      <SelectItem value="updatedDate">{t("tasks.updatedDate")}</SelectItem>
                      <SelectItem value="activityType">
                        {t("tasks.activityType")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 w-[140px]"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>{t("tasks.groupBy")}</span>
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
                  {t("tasks.newTask")}
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
              {t("tasks.noTasks")}
            </div>
          )}
          {tasks.length < totalTasks && (
            <div className="flex justify-center p-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  loadTasks(
                    page + 1,
                    filterKey,
                    statusFilter,
                    searchTerm || undefined,
                  )
                }
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? t("common.loading") : t("tasks.loadMore")}
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
