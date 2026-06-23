import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";

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
    .max(APP_CONSTANTS.MAX_JOB_TAGS, { message: `Maximum ${APP_CONSTANTS.MAX_JOB_TAGS} skill tags allowed.` })
    .optional(),
});
