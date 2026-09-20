"use client";
import { useTransition, useEffect } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Loader } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import SelectFormCtrl from "../Select";
import { toastActionResult } from "@/lib/toast";
import { JobStageTypeRef } from "@/models/jobStage.model";
import { JobStatus } from "@/models/job.model";
import {
  createJobStageType,
  updateJobStageType,
} from "@/actions/jobStageType.actions";

const AddJobStageTypeFormSchema = z.object({
  label: z
    .string({ error: "Stage name is required." })
    .min(1, { message: "Stage name cannot be empty." })
    .max(80, { message: "Stage name must be 80 characters or fewer." }),
  statusId: z
    .string({ error: "Parent status is required." })
    .min(1, { message: "Pick the status this stage means." }),
});

type AddJobStageTypeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: JobStageTypeRef | null;
  statuses: JobStatus[];
  reloadTypes: () => void;
};

function AddJobStageType({
  open,
  onOpenChange,
  type,
  statuses,
  reloadTypes,
}: AddJobStageTypeProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof AddJobStageTypeFormSchema>>({
    resolver: zodResolver(AddJobStageTypeFormSchema),
    defaultValues: { label: "", statusId: "" },
  });

  const { reset } = form;

  // A custom stage is most often an interview round, so that is the default.
  useEffect(() => {
    if (!open) return;
    reset({
      label: type?.label ?? "",
      statusId:
        type?.statusId ??
        statuses.find((s) => s.value === "interview")?.id ??
        "",
    });
  }, [open, type, statuses, reset]);

  const onSubmit = (values: z.infer<typeof AddJobStageTypeFormSchema>) => {
    startTransition(async () => {
      const res = type
        ? await updateJobStageType(
            type.id,
            values.label,
            values.statusId,
            type.sortOrder,
          )
        : await createJobStageType(values.label, values.statusId);
      toastActionResult(res, {
        success: `Stage has been ${type ? "updated" : "added"} successfully.`,
        onSuccess: () => {
          onOpenChange(false);
          reset();
          reloadTypes();
        },
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type ? "Edit Stage" : "Add New Stage"}
          </DialogTitle>
          <DialogDescription>
            Stages are the steps a job moves through — each one belongs to a
            status, which the job takes on when the stage becomes current.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Take-home Exercise"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="statusId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Parent Status</FormLabel>
                  <SelectFormCtrl
                    label="status"
                    options={statuses}
                    field={field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
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

export default AddJobStageType;
