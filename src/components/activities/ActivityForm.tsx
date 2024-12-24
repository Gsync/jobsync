"use client";

import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { AddActivityFormSchema } from "@/models/addActivityForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  addMinutes,
  differenceInHours,
  differenceInMinutes,
  format,
} from "date-fns";
import { DatePicker } from "../DatePicker";
import TiptapEditor from "../TiptapEditor";
import { Combobox } from "../ComboBox";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityType } from "@/models/activity.model";
import {
  createActivity,
  getAllActivityTypes,
} from "@/actions/activity.actions";
import { combineDateAndTime } from "@/lib/utils";

interface ActivityFormProps {
  onClose: () => void;
  reloadActivities: () => void;
}

type Duration = {
  hours: number;
  minutes: number;
};

const ActivityFormComponent = ({
  onClose,
  reloadActivities,
}: ActivityFormProps) => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [duration, setDuration] = useState<Duration | null>(null);
  const defaultValues = useMemo(() => {
    const now = new Date();
    const currentTime = format(now, "hh:mm a");
    const nowPlus5mins = addMinutes(now, 5);
    const estimatedEndTime = format(nowPlus5mins, "hh:mm a");

    return {
      activityName: "",
      activityType: "",
      startDate: now,
      startTime: currentTime,
      endDate: now,
      endTime: estimatedEndTime,
    };
  }, []);
  const form = useForm<z.infer<typeof AddActivityFormSchema>>({
    resolver: zodResolver(AddActivityFormSchema),
    defaultValues,
  });

  const {
    reset,
    getValues,
    watch,
    formState: { errors, isValid },
  } = form;

  const loadActivityTypes = useCallback(async () => {
    const activityTypes = await getAllActivityTypes();
    setActivityTypes(activityTypes);
  }, []);

  const calculateDuration = useCallback(() => {
    const [startDate, startTime, endDate, endTime] = getValues([
      "startDate",
      "startTime",
      "endDate",
      "endTime",
    ]);
    const startDateTime =
      startDate && startTime ? combineDateAndTime(startDate, startTime) : null;

    const endDateTime =
      endDate && endTime ? combineDateAndTime(endDate!, endTime!) : null;

    if (startDateTime && endDateTime) {
      const hours = differenceInHours(endDateTime, startDateTime);
      const totalMinutes = differenceInMinutes(endDateTime, startDateTime);
      const minutes = totalMinutes % 60;

      setDuration({ hours, minutes });
    } else {
      setDuration(null);
    }
  }, [getValues]);

  useEffect(() => {
    loadActivityTypes();
    const subscription = watch((value, { name }) => {
      if (
        ["startDate", "startTime", "endDate", "endTime"].includes(name || "")
      ) {
        calculateDuration();
      }
    });

    return () => subscription.unsubscribe();
  }, [calculateDuration, loadActivityTypes, watch]);

  const onSubmit = async (data: z.infer<typeof AddActivityFormSchema>) => {
    const { startDate, startTime, endDate, endTime, ...rest } = data;
    try {
      const startDateTime = combineDateAndTime(startDate, startTime);
      const endDateTime =
        endDate && endTime ? combineDateAndTime(endDate, endTime) : null;
      const totalMinutes = endDateTime
        ? differenceInMinutes(endDateTime, startDateTime)
        : undefined;
      const payload = {
        ...rest,
        startTime: startDateTime,
        endTime: endDateTime ?? undefined,
        duration: totalMinutes,
      };
      const response = await createActivity(payload);
      onClose();
      reloadActivities();
    } catch (error) {
      console.error("Error parsing date and time:", error);
    }
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"
      >
        {/* ACTIVITY NAME */}
        <div>
          <FormField
            control={form.control}
            name="activityName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex: Job Search, Learning skill, etc"
                  />
                </FormControl>
                <FormMessage>
                  {errors.activityName && (
                    <span className="text-red-500">
                      {errors.activityName?.message}
                    </span>
                  )}
                </FormMessage>
              </FormItem>
            )}
          />
        </div>

        {/* ACTIVITY TYPE */}
        <div>
          <FormField
            control={form.control}
            name="activityType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity Type</FormLabel>
                <FormControl>
                  <Combobox options={activityTypes} field={field} creatable />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Start Date */}
        <div>
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <DatePicker field={field} presets={false} isEnabled={true} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Start Time */}
        <div>
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="hh:mm AM/PM" />
                </FormControl>
                <FormMessage>
                  {errors.startTime && (
                    <span className="text-red-500">
                      {errors.startTime?.message}
                    </span>
                  )}
                </FormMessage>
              </FormItem>
            )}
          />
        </div>

        {/* End Date */}
        <div>
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <DatePicker field={field} presets={false} isEnabled={true} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* End Time */}
        <div>
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  End Time
                  <span className="text-sm">
                    {duration && (
                      <span>
                        {" "}
                        ({duration.hours > 0 ? `${duration.hours} h` : ""}
                        {duration.minutes > 0
                          ? `${duration.hours > 0 ? " " : ""}${
                              duration.minutes
                            } min`
                          : ""}
                        {!duration.hours && !duration.minutes ? "0 mins" : ""})
                      </span>
                    )}
                  </span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="hh:mm AM/PM" />
                </FormControl>
                <FormMessage>
                  {errors.endTime && (
                    <span className="text-red-500">
                      {errors.endTime?.message}
                    </span>
                  )}
                </FormMessage>
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel id="job-description-label">Description</FormLabel>
                <FormControl>
                  <TiptapEditor field={field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="md:col-span-2 mt-4">
          <DialogFooter>
            <div>
              <Button
                type="reset"
                variant="outline"
                className="mt-2 md:mt-0 w-full"
                onClick={() => onClose()}
              >
                Cancel
              </Button>
            </div>
            <Button type="submit" data-testid="save-activity-btn">
              Save
              {/* {isPending && <Loader className="h-4 w-4 shrink-0 spinner" />} */}
            </Button>
          </DialogFooter>
        </div>
      </form>
    </Form>
  );
};

export const ActivityForm = memo(ActivityFormComponent);
ActivityForm.displayName = "ActivityForm";
