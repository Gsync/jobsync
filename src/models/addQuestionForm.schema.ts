import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";

export const AddQuestionFormSchema = z.object({
  id: z.string().optional(),
  question: z
    .string({ error: "Question is required." })
    .min(APP_CONSTANTS.MIN_QUESTION_LENGTH, { error: `Question must be at least ${APP_CONSTANTS.MIN_QUESTION_LENGTH} characters.` })
    .max(APP_CONSTANTS.MAX_QUESTION_LENGTH, { error: `Question cannot exceed ${APP_CONSTANTS.MAX_QUESTION_LENGTH} characters.` }),
  answer: z
    .string({ error: "Answer is required." })
    .max(APP_CONSTANTS.MAX_QUESTION_ANSWER_LENGTH, { error: `Answer cannot exceed ${APP_CONSTANTS.MAX_QUESTION_ANSWER_LENGTH} characters.` })
    .refine((val) => val === "TBD" || val.length >= APP_CONSTANTS.MIN_QUESTION_ANSWER_LENGTH, { error: `Answer must be at least ${APP_CONSTANTS.MIN_QUESTION_ANSWER_LENGTH} characters.` }),
  tagIds: z
    .array(z.string())
    .max(APP_CONSTANTS.MAX_JOB_TAGS, { error: `Maximum ${APP_CONSTANTS.MAX_JOB_TAGS} skill tags allowed.` })
    .optional(),
});
