"use client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createTask, updateTask } from "@/actions/task.actions";
import { toast } from "../ui/use-toast";
import { useEffect, useTransition } from "react";
import { Loader, CalendarDays } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { TASK_STATUSES } from "@/models/task.model";

const ReminderFormSchema = z.object({
  id: z.string().optional(),
  title: z
    .string({ error: "Title is required." })
    .min(2, { message: "Title must be at least 2 characters." }),
  status: z.enum(["in-progress", "complete", "needs-attention", "cancelled"]),
  dueDate: z
    .date()
    .optional()
    .nullable()
    .refine(
      (date) => {
        if (!date) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      },
      { message: "Due date cannot be in the past." }
    ),
});

type ReminderFormValues = z.infer<typeof ReminderFormSchema>;

type JobReminderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  editTask?: {
    id: string;
    title: string;
    status: string;
    dueDate?: Date | null;
  } | null;
  onSaved: () => void;
};

const DEFAULT_DUE_DAYS = 5;

export function JobReminderDialog({
  open,
  onOpenChange,
  jobId,
  editTask,
  onSaved,
}: JobReminderDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(ReminderFormSchema) as any,
    defaultValues: {
      title: "Follow up with recruiter",
      status: "in-progress",
      dueDate: addDays(new Date(), DEFAULT_DUE_DAYS),
    },
  });

  useEffect(() => {
    if (editTask) {
      form.reset({
        id: editTask.id,
        title: editTask.title,
        status: editTask.status as ReminderFormValues["status"],
        dueDate: editTask.dueDate ? new Date(editTask.dueDate) : null,
      });
    } else {
      form.reset({
        title: "Follow up with recruiter",
        status: "in-progress",
        dueDate: addDays(new Date(), DEFAULT_DUE_DAYS),
      });
    }
  }, [editTask, open, form]);

  function onSubmit(values: ReminderFormValues) {
    startTransition(async () => {
      const payload = {
        ...values,
        jobId,
        priority: 5,
        percentComplete: 0,
        description: null,
        activityTypeId: null,
      };

      const result = editTask
        ? await updateTask(payload)
        : await createTask(payload);

      if (result.success) {
        toast({
          variant: "success",
          description: `Reminder ${editTask ? "updated" : "created"} successfully`,
        });
        onOpenChange(false);
        onSaved();
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: result.message,
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {editTask ? "Edit Reminder" : "Add Reminder"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Follow up with recruiter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TASK_STATUSES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "PP")
                              : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="flex gap-1 p-2 border-b flex-wrap">
                          {[3, 5, 7, 14].map((days) => (
                            <Button
                              key={days}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() =>
                                field.onChange(addDays(new Date(), days))
                              }
                            >
                              +{days}d
                            </Button>
                          ))}
                        </div>
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Save
                {isPending && (
                  <Loader className="ml-2 h-4 w-4 shrink-0 spinner" />
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
