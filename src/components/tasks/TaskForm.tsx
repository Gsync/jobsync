"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createTask, updateTask } from "@/actions/task.actions";
import { format } from "date-fns";
import { Loader, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { useEffect, useTransition } from "react";
import { AddTaskFormSchema } from "@/models/addTaskForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Task, TASK_STATUSES, TaskStatus } from "@/models/task.model";
import { z } from "zod";
import { toast } from "../ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import SelectFormCtrl from "../Select";
import { DatePicker } from "../DatePicker";
import TiptapEditor from "../TiptapEditor";
import { Input } from "../ui/input";
import { Combobox } from "../ComboBox";
import { Slider } from "../ui/slider";
import { ActivityType } from "@/models/activity.model";

type TaskFormProps = {
  activityTypes: ActivityType[];
  editTask?: Task | null;
  resetEditTask: () => void;
  onTaskSaved: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
};

const statusOptions = Object.entries(TASK_STATUSES).map(([value, label]) => ({
  id: value,
  label,
  value,
}));

export function TaskForm({
  activityTypes,
  editTask,
  resetEditTask,
  onTaskSaved,
  dialogOpen,
  setDialogOpen,
}: TaskFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof AddTaskFormSchema>>({
    resolver: zodResolver(AddTaskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "in-progress" as TaskStatus,
      priority: 5,
      percentComplete: 0,
      dueDate: undefined,
      activityTypeId: undefined,
    },
  });

  const { reset, watch } = form;

  const priorityValue = watch("priority");
  const percentCompleteValue = watch("percentComplete");

  useEffect(() => {
    if (editTask) {
      reset({
        id: editTask.id,
        userId: editTask.userId,
        title: editTask.title,
        description: editTask.description || "",
        status: editTask.status,
        priority: editTask.priority,
        percentComplete: editTask.percentComplete,
        dueDate: editTask.dueDate ? new Date(editTask.dueDate) : undefined,
        activityTypeId: editTask.activityTypeId || undefined,
      });
    } else {
      reset({
        title: "",
        description: "",
        status: "in-progress",
        priority: 5,
        percentComplete: 0,
        dueDate: undefined,
        activityTypeId: undefined,
      });
    }
  }, [editTask, reset]);

  function onSubmit(data: z.infer<typeof AddTaskFormSchema>) {
    startTransition(async () => {
      const { success, message } = editTask
        ? await updateTask(data)
        : await createTask(data);

      if (success) {
        toast({
          variant: "success",
          description: `Task has been ${editTask ? "updated" : "created"} successfully`,
        });
        reset();
        setDialogOpen(false);
        resetEditTask();
        onTaskSaved();
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
    });
  }

  const pageTitle = editTask ? "Edit Task" : "Add Task";

  const closeDialog = () => {
    reset();
    resetEditTask();
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogOverlay>
        <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="task-form-dialog-title">
              {pageTitle}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"
            >
              {/* Title */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Activity Type */}
              <div>
                <FormField
                  control={form.control}
                  name="activityTypeId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Activity Type</FormLabel>
                      <FormControl>
                        <Combobox
                          options={activityTypes}
                          field={{
                            ...field,
                            name: "activityType",
                          }}
                          creatable
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status */}
              <div>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-col [&>button]:capitalize">
                      <FormLabel>Status</FormLabel>
                      <SelectFormCtrl
                        label="Task Status"
                        options={statusOptions}
                        field={field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Priority */}
              <div>
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Priority: {priorityValue}</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="mt-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low (0)</span>
                        <span>High (10)</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Percent Complete */}
              <div>
                <FormField
                  control={form.control}
                  name="percentComplete"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>% Complete: {percentCompleteValue}%</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="mt-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Due Date */}
              <div>
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <DatePicker
                        field={field}
                        presets={true}
                        isEnabled={true}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Created and Updated Dates */}
              {editTask && (
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {editTask.createdAt
                        ? format(
                            new Date(editTask.createdAt),
                            "MMM d, yyyy h:mm a",
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {editTask.updatedAt
                        ? format(
                            new Date(editTask.updatedAt),
                            "MMM d, yyyy h:mm a",
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <TiptapEditor field={field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <DialogFooter>
                  <div>
                    <Button
                      type="reset"
                      variant="outline"
                      className="mt-2 md:mt-0 w-full"
                      onClick={closeDialog}
                    >
                      Cancel
                    </Button>
                  </div>
                  <Button type="submit" data-testid="save-task-btn">
                    Save
                    {isPending && (
                      <Loader className="h-4 w-4 shrink-0 spinner ml-2" />
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
}
