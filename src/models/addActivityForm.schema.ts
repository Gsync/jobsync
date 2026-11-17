import { APP_CONSTANTS } from "@/lib/constants";
import { combineDateAndTime } from "@/lib/utils";
import { differenceInMinutes, startOfDay } from "date-fns";
import { z } from "zod";

export const AddActivityFormSchema = z
  .object({
    id: z.string().optional(),
    userId: z.string().optional(),
    activityName: z
      .string({
        error: "Activity name is required.",
      })
      .min(2, {
        error: "Activity name must be at least 2 characters.",
      }),
    activityType: z.string().min(1, {
      error: "Activity type is required.",
    }),
    startDate: z.date(),
    startTime: z
      .string()
      .regex(
        /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
        "Start time must be in hh:mm AM/PM format"
      ),
    endDate: z.date().optional(),
    endTime: z
      .string()
      .regex(
        /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
        "End time must be in hh:mm AM/PM format"
      )
      .optional(),
    duration: z
      .number()
      .min(0, "Duration must be a positive number")
      .optional(),
    description: z
      .string()
      .max(1000, {
        error: "Description cannot be more than 1000 characters.",
      })
      .optional(),
  })
  // Compare calendar days only: a picked date is local midnight while an
  // untouched default carries the current time, so raw Dates aren't comparable
  .refine(
    (data) => {
      if (!data.endDate) return true; // Skip if no endDate
      return startOfDay(data.endDate) >= startOfDay(data.startDate);
    },
    {
      error: "End date must be the same as or after the start date",
      path: ["endDate"], // Target the error message to `endDate`
    }
  )
  // Check if the end date/time is earlier than the start date/time
  .refine(
    (data) => {
      if (!data.endDate || !data.endTime) return true; // Skip if no endDate or endTime

      // Combine date and time to compare
      const startDateTime = combineDateAndTime(data.startDate, data.startTime);
      const endDateTime = combineDateAndTime(data.endDate, data.endTime);

      return endDateTime > startDateTime; // Valid only if endDateTime is after startDateTime
    },
    {
      error: "End time must be after the start time",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      if (!data.endDate || !data.endTime) return true; // Skip if no endDate or endTime

      const startDateTime = combineDateAndTime(data.startDate, data.startTime);
      const endDateTime = combineDateAndTime(data.endDate, data.endTime);

      const durationInMinutes = differenceInMinutes(endDateTime, startDateTime);
      return durationInMinutes <= APP_CONSTANTS.ACTIVITY_MAX_DURATION_MINUTES; // Ensure duration is within max duration allowed
    },
    {
      error: `The duration between start and end date/time cannot exceed ${
        APP_CONSTANTS.ACTIVITY_MAX_DURATION_MINUTES / 60
      } hours`,
      path: ["endTime"],
    }
  )
  // Match the timer, which discards anything shorter than the minimum
  .refine(
    (data) => {
      if (!data.endDate || !data.endTime) return true; // Skip if no endDate or endTime

      const startDateTime = combineDateAndTime(data.startDate, data.startTime);
      const endDateTime = combineDateAndTime(data.endDate, data.endTime);

      const durationInMinutes = differenceInMinutes(endDateTime, startDateTime);
      return durationInMinutes >= APP_CONSTANTS.ACTIVITY_MIN_DURATION_MINUTES;
    },
    {
      error: `An activity must be at least ${APP_CONSTANTS.ACTIVITY_MIN_DURATION_MINUTES} minutes long`,
      path: ["endTime"],
    }
  )
  .refine(
    (data) => combineDateAndTime(data.startDate, data.startTime) <= new Date(),
    {
      error: "Start date/time cannot be in the future",
      path: ["startTime"],
    }
  );
