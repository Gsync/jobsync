import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";

export const AddQuestionFormSchema = z.object({
  id: z.string().optional(),
  question: z
    .string({ error: "Question is required." })
    .min(APP_CONSTANTS.MIN_QUESTION_LENGTH, { message: `Question must be at least ${APP_CONSTANTS.MIN_QUESTION_LENGTH} characters.` })
    .max(APP_CONSTANTS.MAX_QUESTION_LENGTH, { message: `Question cannot exceed ${APP_CONSTANTS.MAX_QUESTION_LENGTH} characters.` }),
  answer: z
    .string({ error: "Answer is required." })
    .min(APP_CONSTANTS.MIN_QUESTION_ANSWER_LENGTH, { message: `Answer must be at least ${APP_CONSTANTS.MIN_QUESTION_ANSWER_LENGTH} characters.` })
    .max(APP_CONSTANTS.MAX_QUESTION_ANSWER_LENGTH, { message: `Answer cannot exceed ${APP_CONSTANTS.MAX_QUESTION_ANSWER_LENGTH} characters.` }),
  tagIds: z
    .array(z.string())
    .max(APP_CONSTANTS.MAX_JOB_TAGS, { message: `Maximum ${APP_CONSTANTS.MAX_JOB_TAGS} skill tags allowed.` })
    .optional(),
});
