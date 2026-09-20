"use client";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ComboBox";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import SelectFormCtrl from "@/components/Select";
import { toastActionResult } from "@/lib/toast";
import { STAGE_OUTCOMES } from "@/lib/constants";
import { addJobStage, updateJobStage } from "@/actions/jobStage.actions";
import {
  AddJobStageFormSchema,
  type AddJobStageValues,
  type JobStage,
  type JobStageTypeRef,
} from "@/models/jobStage.model";
import type { JobStatus } from "@/models/job.model";

type AddStageDialogProps = {
  open: boolean;
  jobId: string;
  jobLabel: string;
  stage: JobStage | null;
  stageTypes: JobStageTypeRef[];
  jobStatuses: JobStatus[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const OUTCOME_OPTIONS = STAGE_OUTCOMES.map((o) => ({
  id: o.value,
  label: o.label,
}));

// Adding a stage is almost always recording something that just happened, so
// the pickers open on now. Clear the date (click the selected day again) for
// a stage whose date isn't known yet.
const emptyValues = (jobId: string): AddJobStageValues => ({
  jobId,
  stageTypeId: "",
  customLabel: "",
  customStatusId: "",
  date: new Date(),
  time: format(new Date(), "hh:mm a"),
  notes: "",
  outcome: null,
  durationMins: null,
  format: "",
  location: "",
  setAsCurrent: true,
});

const editValues = (jobId: string, stage: JobStage): AddJobStageValues => ({
  ...emptyValues(jobId),
  id: stage.id,
  stageTypeId: stage.stageTypeId,
  date: stage.occurredAt ?? null,
  time: stage.occurredAt ? format(stage.occurredAt, "hh:mm a") : "",
  notes: stage.notes ?? "",
  outcome: stage.outcome ?? null,
  durationMins: stage.durationMins ?? null,
  format: stage.format ?? "",
  location: stage.location ?? "",
  setAsCurrent: stage.isCurrent,
});

export function AddStageDialog({
  open,
  jobId,
  jobLabel,
  stage,
  stageTypes,
  jobStatuses,
  onOpenChange,
  onSaved,
}: AddStageDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AddJobStageValues>({
    resolver: zodResolver(AddJobStageFormSchema) as any,
    defaultValues: emptyValues(jobId),
  });

  const { reset } = form;

  // The host renders this dialog permanently and only flips `open`, so it
  // cannot call reset() itself — the same reason AddContact resets on open.
  useEffect(() => {
    if (!open) return;
    reset(stage ? editValues(jobId, stage) : emptyValues(jobId), {
      keepDefaultValues: true,
    });
  }, [open, stage, jobId, reset]);

  const customLabel = form.watch("customLabel");
  const isCustom = !!customLabel?.trim();
  const statusValue = isCustom
    ? jobStatuses.find((s) => s.id === form.watch("customStatusId"))?.value
    : stageTypes.find((t) => t.id === form.watch("stageTypeId"))?.Status?.value;
  const showInterviewFields = statusValue === "interview";

  // Nothing demotes a stage: stageDataFrom never writes isCurrent, so an
  // unticked box here would save without error and change nothing.
  const currentLocked = !!stage?.isCurrent;

  const onSubmit = (values: AddJobStageValues) => {
    startTransition(async () => {
      const res = stage
        ? await updateJobStage({ ...values, id: stage.id })
        : await addJobStage(values);
      toastActionResult(res, {
        success: `Stage has been ${stage ? "updated" : "added"} successfully`,
        onSuccess: () => {
          onSaved();
          onOpenChange(false);
        },
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stage ? "Edit Stage" : "Add Stage"}</DialogTitle>
          <DialogDescription>{jobLabel}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
            <FormField
              control={form.control}
              name="stageTypeId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>STAGE</FormLabel>
                  <div data-testid="stage-type-select">
                    <Combobox
                      options={stageTypes}
                      field={field}
                      fullWidth
                      label="stage"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OR ENTER A CUSTOM STAGE NAME</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Panel Interview, Reference Check…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isCustom && (
              <FormField
                control={form.control}
                name="customStatusId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>PARENT STATUS</FormLabel>
                    <SelectFormCtrl
                      label="status"
                      options={jobStatuses}
                      field={field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>DATE</FormLabel>
                    <DatePicker
                      field={field}
                      presets={false}
                      isEnabled
                      captionLayout
                      fullWidth
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>TIME</FormLabel>
                    <TimePicker field={field} fullWidth />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showInterviewFields && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FORMAT</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Video, Phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationMins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DURATION (MIN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LOCATION</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 200 King St W, or a meeting link"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {stage && (
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>OUTCOME</FormLabel>
                    <SelectFormCtrl
                      label="outcome"
                      options={OUTCOME_OPTIONS}
                      field={{ ...field, value: field.value ?? "" }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NOTES (OPTIONAL)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20"
                      placeholder="Add any context for this stage…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="setAsCurrent"
              render={({ field }) => (
                <FormItem>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0"
                      checked={!!field.value}
                      disabled={currentLocked}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <span className="text-[13px]">Set as current stage</span>
                  </label>
                  {currentLocked && (
                    <p className="text-xs text-muted-foreground">
                      This is the current stage — tick the box on another stage
                      to move it.
                    </p>
                  )}
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
                {stage ? "Save Changes" : "Add Stage"}
                {isPending && <Loader className="h-4 w-4 shrink-0 spinner" />}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
