import { z } from "zod";

export const AddJobFormSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
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
  type: z.string().min(1),
  source: z
    .string({
      required_error: "Source is required.",
    })
    .min(2, {
      message: "Source name must be at least 2 characters.",
    }),
  status: z
    .string({
      required_error: "Status is required.",
    })
    .min(2, {
      message: "Status must be at least 2 characters.",
    })
    .default("draft"),
  dueDate: z.date(),
  /**
   * Note: Timezone offsets can be allowed by setting the offset option to true.
   * z.string().datetime({ offset: true });
   */
  //
  dateApplied: z.date().optional(),
  salaryRange: z.string(),
  jobDescription: z
    .string({
      required_error: "Job description is required.",
    })
    .min(10, {
      message: "Job description must be at least 10 characters.",
    }),
  jobUrl: z.string().optional(),
  applied: z.boolean().default(false),
  resume: z.string().optional(),
});
