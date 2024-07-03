import { z } from "zod";

export const AddSummarySectionFormSchema = z.object({
  id: z.string().optional(),
  sectionTitle: z
    .string({
      required_error: "Section title is required.",
    })
    .min(1),
  sectionType: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  resumeId: z.string().optional(),
  content: z
    .string({
      required_error: "Summary content is required",
    })
    .min(10),
});
