import { z } from "zod";

export const CopyResumeFormSchema = z.object({
  title: z
    .string()
    .min(1, "Resume title is required.")
    .max(100, "Title must be less than 100 characters"),
});
