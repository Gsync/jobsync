import { z } from "zod";

export const CoverLetterFormSchema = z.object({
  id: z.string().optional(),
  title: z
    .string({
      error: "Cover letter title is required.",
    })
    .min(1, {
      message: "Cover letter title is required.",
    })
    .max(100, {
      message: "Title must be less than 100 characters.",
    }),
  content: z
    .string({
      error: "Cover letter content is required.",
    })
    .min(10, {
      message: "Cover letter content must be at least 10 characters.",
    }),
});
