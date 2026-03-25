import { APP_CONSTANTS } from "@/lib/constants";
import { combineDateAndTime } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";
import { z } from "zod";

// 12h format: "1:30 PM", "01:30 AM", "12:00 PM"
const TIME_12H_REGEX = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
// 24h format: "14:30", "08:00", "0:05", "23:59"
const TIME_24H_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Returns true if the given locale uses 24-hour time format.
 * Mirrors the logic in src/lib/formatters.ts is24Hour().
 */
function isLocale24h(locale: string): boolean {
  const hour12Locales = ["en", "el", "mt"];
  return !hour12Locales.includes(locale);
}

/**
 * Creates a locale-aware Zod schema for the activity form.
 * For 24h locales (de, fr, es), validates against HH:mm format.
 * For 12h locales (en), validates against h:mm AM/PM format.
 */
export function createAddActivityFormSchema(locale: string) {
  const use24h = isLocale24h(locale);
  const timeRegex = use24h ? TIME_24H_REGEX : TIME_12H_REGEX;
  const timeFormatHint = use24h ? "HH:mm" : "hh:mm AM/PM";

  return z
    .object({
      id: z.string().optional(),
      userId: z.string().optional(),
      activityName: z
        .string({
          error: "Activity name is required.",
        })
        .min(2, {
          message: "Activity name must be at least 2 characters.",
        }),
      activityType: z.string().min(1),
      startDate: z.date(),
      startTime: z
        .string()
        .regex(
          timeRegex,
          `Start time must be in ${timeFormatHint} format`
        ),
      endDate: z.date().optional(),
      endTime: z
        .string()
        .regex(
          timeRegex,
          `End time must be in ${timeFormatHint} format`
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
}

/**
 * @deprecated Use createAddActivityFormSchema(locale) for locale-aware validation.
 * Kept for backward compatibility with server-side code that may import it.
 */
export const AddActivityFormSchema = createAddActivityFormSchema("en");
