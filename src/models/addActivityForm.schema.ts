import { APP_CONSTANTS } from "@/lib/constants";
import { combineDateAndTime } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";
import { z } from "zod";

export const AddActivityFormSchema = z
  .object({
    id: z.string().optional(),
    userId: z.string().optional(),
    activityName: z
      .string({
        required_error: "Activity name is required.",
      })
      .min(2, {
        message: "Activity name must be at least 2 characters.",
      }),
    activityType: z.string().min(1),
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
        message: "Description cannot be more than 1000 characters.",
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true; // Skip if no endDate
      return data.endDate >= data.startDate;
    },
    {
      message: "End date must be the same as or after the start date",
      path: ["endDate"], // Target the error message to `endDate`
    }
  )
  // Check if `endTime` is earlier than `startTime` when the `endDate` equals `startDate`
  .refine(
    (data) => {
      if (!data.endDate || !data.endTime) return true; // Skip if no endDate or endTime
      if (data.endDate > data.startDate) return true; // Valid if endDate is after startDate

      // Combine date and time to compare
      const startDateTime = combineDateAndTime(data.startDate, data.startTime);
      const endDateTime = combineDateAndTime(data.endDate, data.endTime);

      return endDateTime > startDateTime; // Valid only if endDateTime is after startDateTime
    },
    {
      message:
        "End time must be after the start time when the end date is the same",
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
      message: `The duration between start and end date/time cannot exceed ${
        APP_CONSTANTS.ACTIVITY_MAX_DURATION_MINUTES / 60
      } hours`,
      path: ["endTime"],
    }
  );
