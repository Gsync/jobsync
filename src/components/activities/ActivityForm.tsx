"use client";

import { useTranslations } from "@/i18n";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { createAddActivityFormSchema } from "@/models/addActivityForm.schema";
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
} from "date-fns";
import { formatTime } from "@/i18n";
import { DatePicker } from "../DatePicker";
import TiptapEditor from "../TiptapEditor";
import { Combobox } from "../ComboBox";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityType } from "@/models/activity.model";
import {
  createActivity,
  createActivityType,
  getAllActivityTypes,
} from "@/actions/activity.actions";
import { toast } from "../ui/use-toast";
import { combineDateAndTime } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";

interface ActivityFormProps {
  onClose: () => void;
  reloadActivities: () => void;
}

type Duration = {
  hours: number;
  minutes: number;
};

const MAX_DURATION_HOURS = APP_CONSTANTS.ACTIVITY_MAX_DURATION_MINUTES / 60;

const ActivityFormComponent = ({
  onClose,
  reloadActivities,
}: ActivityFormProps) => {
  const { t, locale } = useTranslations();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [durationExceeded, setDurationExceeded] = useState(false);

  const schema = useMemo(() => createAddActivityFormSchema(locale), [locale]);

  const defaultValues = useMemo(() => {
    const now = new Date();
    const currentTime = formatTime(now, locale);
    const nowPlus5mins = addMinutes(now, 5);
    const estimatedEndTime = formatTime(nowPlus5mins, locale);

    return {
      activityName: "",
      activityType: "",
      startDate: now,
      startTime: currentTime,
      endDate: now,
      endTime: estimatedEndTime,
    };
  }, [locale]);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
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
    let startDateTime: Date | null = null;
    let endDateTime: Date | null = null;

    try {
      startDateTime =
        startDate && startTime ? combineDateAndTime(startDate, startTime) : null;
    } catch {
      startDateTime = null;
    }

    try {
      endDateTime =
        endDate && endTime ? combineDateAndTime(endDate!, endTime!) : null;
    } catch {
      endDateTime = null;
    }

    if (startDateTime && endDateTime) {
      const totalMinutes = differenceInMinutes(endDateTime, startDateTime);

      if (totalMinutes < 0) {
        setDuration(null);
        setDurationExceeded(false);
        return;
      }

      const exceeded = totalMinutes > APP_CONSTANTS.ACTIVITY_MAX_DURATION_MINUTES;
      setDurationExceeded(exceeded);

      const hours = differenceInHours(endDateTime, startDateTime);
      const minutes = totalMinutes % 60;

      setDuration({ hours, minutes });
    } else {
      setDuration(null);
      setDurationExceeded(false);
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

  const onSubmit = async (data: z.infer<typeof schema>) => {
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

  const formatDurationLabel = (dur: Duration): string => {
    if (dur.hours > 0) {
      return t("activities.durationLabel")
        .replace("{hours}", String(dur.hours))
        .replace("{minutes}", String(dur.minutes));
    }
    if (dur.minutes > 0) {
      return t("activities.durationMinutesOnly").replace(
        "{minutes}",
        String(dur.minutes)
      );
    }
    return t("activities.durationZero");
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
                <FormLabel>{t("activities.activityName")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("activities.activityNamePlaceholder")}
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
                <FormLabel>{t("activities.activityType")}</FormLabel>
                <FormControl>
                  <Combobox
                    options={activityTypes}
                    field={field}
                    creatable
                    onCreateOption={async (label) => {
                      const res = await createActivityType(label);
                      if (!res.success) {
                        toast({
                          variant: "destructive",
                          title: t("common.error"),
                          description: res.message,
                        });
                        return null;
                      }
                      return res.data as { id: string; label: string; value: string };
                    }}
                  />
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
                <FormLabel>{t("activities.startDate")}</FormLabel>
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
                <FormLabel>{t("activities.startTime")}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t("activities.timePlaceholder")} />
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
                <FormLabel>{t("activities.endDate")}</FormLabel>
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
                  {t("activities.endTime")}
                  {duration && (
                    <span className={`text-sm ml-1 ${durationExceeded ? "text-red-500 font-medium" : ""}`}>
                      ({formatDurationLabel(duration)})
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t("activities.timePlaceholder")} />
                </FormControl>
                <FormMessage>
                  {errors.endTime && (
                    <span className="text-red-500">
                      {errors.endTime?.message}
                    </span>
                  )}
                </FormMessage>
                {durationExceeded && !errors.endTime && (
                  <p className="text-sm text-red-500">
                    {t("activities.durationExceedsMax").replace(
                      "{max}",
                      String(MAX_DURATION_HOURS)
                    )}
                  </p>
                )}
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
                <FormLabel id="job-description-label">{t("activities.description")}</FormLabel>
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
                {t("common.cancel")}
              </Button>
            </div>
            <Button type="submit" data-testid="save-activity-btn">
              {t("common.save")}
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
