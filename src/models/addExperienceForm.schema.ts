import { z } from "zod";

export const AddExperienceFormSchema = z.object({
  id: z.string().optional(),
  resumeId: z.string().optional(),
  sectionId: z.string().optional(),
  sectionTitle: z.string().default("Experience").optional(),
  sectionType: z.string().optional(),
  title: z
    .string({
      required_error: "Job title is required.",
    })
    .min(2, {
      message: "Job title must be at least 2 characters.",
    }),
  company: z
    .string({
      required_error: "Company name is required.",
    })
    .min(2, {
      message: "Company name must be at least 2 characters.",
    }),
  location: z
    .string({
      required_error: "Location is required.",
    })
    .min(2, {
      message: "Location name must be at least 2 characters.",
    }),
  jobDescription: z.string().min(10, {
    message: "Job description must be at least 10 characters.",
  }),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  currentJob: z.boolean().default(false).optional(),
});
