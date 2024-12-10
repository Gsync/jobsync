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
import { format } from "date-fns";
import { DatePicker } from "../DatePicker";
import TiptapEditor from "../TiptapEditor";
import { Combobox } from "../ComboBox";
import { useEffect, useState } from "react";
import { ActivityType } from "@/models/activity.model";
import { getAllActivityTypes } from "@/actions/activity.actions";

interface ActivityFormProps {
  onClose: () => void;
}

export function ActivityForm({ onClose }: ActivityFormProps) {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const now = new Date();
  const currentDate = now;
  const currentTime = format(now, "hh:mm a");
  const form = useForm<z.infer<typeof AddActivityFormSchema>>({
    resolver: zodResolver(AddActivityFormSchema),
    defaultValues: {
      activityName: "",
      activityType: "",
      startDate: currentDate,
      startTime: currentTime,
      endDate: currentDate,
      endTime: "",
    },
  });

  const {
    reset,
    formState: { errors, isValid },
  } = form;

  const loadActivityTypes = async () => {
    try {
      const activityTypes = await getAllActivityTypes();
      setActivityTypes(activityTypes);
    } catch (error) {
      console.error("Error loading activity types");
    }
  };

  useEffect(() => {
    loadActivityTypes();
  }, []);

  const onSubmit = (data: z.infer<typeof AddActivityFormSchema>) => {};
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
                <FormLabel>End Time</FormLabel>
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
}
