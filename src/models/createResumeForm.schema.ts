import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";

export const CreateResumeFormSchema = z.object({
  id: z.string().optional(),
  createdBy: z.string().optional(),
  title: z
    .string()
    .min(1, "Resume title is required.")
    .max(100, "Title must be less than 100 characters"),
  profileId: z.string().optional(),
  file: z
    .instanceof(File)
    .refine((file) => (APP_CONSTANTS.RESUME_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type), {
      message: "Only PDF and Word documents are allowed.",
    })
    .refine((file) => file.size <= APP_CONSTANTS.MAX_RESUME_FILE_SIZE_BYTES, {
      message: "File size must be less than 5MB",
    })
    .optional(),
  fileId: z.string().optional(),
});
