import { z } from "zod";

export const NoteFormSchema = z.object({
  id: z.string().optional(),
  jobId: z.string({ error: "Job ID is required." }),
  content: z
    .string({ error: "Content is required." })
    .min(1, { error: "Content cannot be empty." }),
});
