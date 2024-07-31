import { z } from "zod";

export const AddEducationFormSchema = z.object({
  id: z.string().optional(),
  resumeId: z.string().optional(),
  sectionId: z.string().optional(),
  sectionTitle: z.string().default("Education").optional(),
  sectionType: z.string().optional(),
  institution: z
    .string({
      required_error: "Institution name is required.",
    })
    .min(2),
  degree: z
    .string({
      required_error: "Degree is required.",
    })
    .min(2),
  fieldOfStudy: z
    .string({
      required_error: "Field of study is required.",
    })
    .min(2),
  location: z
    .string({
      required_error: "Location is required.",
    })
    .min(2, {
      message: "Location name must be at least 2 characters.",
    }),
  description: z.string().nullable().optional(),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  degreeCompleted: z.boolean().default(true).optional(),
});
