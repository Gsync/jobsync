import { z } from "zod";

export const AddQuestionFormSchema = z.object({
  id: z.string().optional(),
  question: z
    .string({ error: "Question is required." })
    .min(2, { message: "Question must be at least 2 characters." }),
  answer: z
    .string()
    .max(5000, { message: "Answer cannot exceed 5000 characters." })
    .optional()
    .nullable(),
  tagIds: z
    .array(z.string())
    .max(10, { message: "Maximum 10 skill tags allowed." })
    .optional(),
});
