import { startOfDay } from "date-fns";
import { z } from "zod";

export const AddExperienceFormSchema = z.object({
  id: z.string().optional(),
  resumeId: z.string().optional(),
  sectionId: z.string().optional(),
  sectionTitle: z.string().default("Experience").optional(),
  sectionType: z.string().optional(),
  title: z
    .string({
      error: "Job title is required.",
    })
    .min(2, {
      error: "Job title must be at least 2 characters.",
    }),
  company: z
    .string({
      error: "Company name is required.",
    })
    .min(2, {
      error: "Company name must be at least 2 characters.",
    }),
  location: z
    .string({
      error: "Location is required.",
    })
    .min(2, {
      error: "Location name must be at least 2 characters.",
    }),
  jobDescription: z.string().min(10, {
    error: "Job description must be at least 10 characters.",
  }),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  currentJob: z.boolean().default(false).optional(),
  showLocation: z.boolean().default(true).optional(),
}).refine(
  (data) => {
    if (data.currentJob === true || !data.endDate) return true;
    return startOfDay(data.endDate) >= startOfDay(data.startDate);
  },
  {
    error: "End date must be on or after the start date",
    path: ["endDate"],
  },
);
