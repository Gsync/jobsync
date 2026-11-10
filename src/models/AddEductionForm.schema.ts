import { startOfDay } from "date-fns";
import { z } from "zod";

export const AddEducationFormSchema = z.object({
  id: z.string().optional(),
  resumeId: z.string().optional(),
  sectionId: z.string().optional(),
  sectionTitle: z.string().default("Education").optional(),
  sectionType: z.string().optional(),
  institution: z
    .string({
      error: "Institution name is required.",
    })
    .min(2),
  degree: z
    .string({
      error: "Degree is required.",
    })
    .min(2),
  fieldOfStudy: z
    .string({
      error: "Field of study is required.",
    })
    .min(2),
  location: z
    .string({
      error: "Location is required.",
    })
    .min(2, {
      error: "Location name must be at least 2 characters.",
    }),
  description: z.string().nullable().optional(),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  degreeCompleted: z.boolean().default(true).optional(),
  showDates: z.boolean().default(true).optional(),
});
}).refine(
  (data) => {
    if (data.degreeCompleted === false || !data.endDate) return true;
    return startOfDay(data.endDate) >= startOfDay(data.startDate);
  },
  {
    error: "End date must be on or after the start date",
    path: ["endDate"],
  },
);
