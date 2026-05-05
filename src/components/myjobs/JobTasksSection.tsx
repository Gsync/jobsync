"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { getTasksForJob, updateTaskStatus, deleteTaskById } from "@/actions/task.actions";
import { JobReminderDialog } from "./JobReminderDialog";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  ChevronDown,
  PlusCircle,
  BellRing,
  CheckCircle2,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { toast } from "../ui/use-toast";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { Task, TASK_STATUSES, TaskStatus } from "@/models/task.model";

type JobTasksSectionProps = {
  jobId: string;
};

const statusColors: Record<TaskStatus, string> = {
  "in-progress": "bg-blue-500",
  complete: "bg-green-500",
  "needs-attention": "bg-orange-500",
  cancelled: "bg-gray-400",
};

function dueDateLabel(date: Date | null | undefined): {
  text: string;
  className: string;
} {
  if (!date) return { text: "No due date", className: "text-muted-foreground" };
  const d = new Date(date);
  if (isPast(d) && !isToday(d))
    return { text: `Overdue · ${format(d, "PP")}`, className: "text-red-500" };
  if (isToday(d)) return { text: "Due today", className: "text-orange-500" };
  return { text: format(d, "PP"), className: "text-muted-foreground" };
}

export function JobTasksSection({ jobId }: JobTasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadTasks = useCallback(async () => {
    const result = await getTasksForJob(jobId);
    if (result.success) {
      setTasks(result.data);
      if (result.data.length > 0) setIsOpen(true);
    }
  }, [jobId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddReminder = () => {
    setEditTask(null);
    setDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const handleToggleComplete = (task: Task) => {
    const nextStatus: TaskStatus =
      task.status === "complete" ? "in-progress" : "complete";
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, nextStatus);
      if (result.success) {
        loadTasks();
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: result.message,
        });
      }
    });
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskIdToDelete(taskId);
    setDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    const result = await deleteTaskById(taskIdToDelete);
    if (result.success) {
      toast({ variant: "success", description: "Reminder deleted." });
      loadTasks();
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: result.message,
      });
    }
  };

  const activeCount = tasks.filter(
    (t) => t.status !== "complete" && t.status !== "cancelled"
  ).length;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mx-4 mb-4">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
            <BellRing className="h-4 w-4" />
            <span className="font-medium">Reminders</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeCount}
              </Badge>
            )}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={handleAddReminder}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add Reminder
          </Button>
        </div>

        <CollapsibleContent className="mt-3 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders yet.</p>
          ) : (
            tasks.map((task) => {
              const due = dueDateLabel(task.dueDate);
              const isComplete = task.status === "complete";
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md border px-3 py-2 text-sm",
                    isComplete && "opacity-60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    disabled={isPending}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={isComplete ? "Mark as in-progress" : "Mark as complete"}
                  >
                    <CheckCircle2
                      className={cn(
                        "h-4 w-4",
                        isComplete && "text-green-500"
                      )}
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium truncate", isComplete && "line-through")}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-block h-2 w-2 rounded-full shrink-0",
                          statusColors[task.status as TaskStatus]
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        {TASK_STATUSES[task.status as TaskStatus]}
                      </span>
                      {task.dueDate && (
                        <>
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className={cn("text-xs", due.className)}>
                            {due.text}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(task)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(task.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>

      <JobReminderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobId={jobId}
        editTask={editTask}
        onSaved={loadTasks}
      />
      <DeleteAlertDialog
        pageTitle="reminder"
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        onDelete={handleDelete}
      />
    </>
  );
}
