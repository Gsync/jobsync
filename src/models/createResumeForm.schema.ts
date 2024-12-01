import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const SUPPORTED_MIME_TYPES = [
  "application/pdf", // PDF
  "application/msword", // Word .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word .docx
];

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
    .refine((file) => SUPPORTED_MIME_TYPES.includes(file.type), {
      message: "Only PDF and Word documents are allowed.",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size must be less than 5MB",
    })
    .optional(),
  fileId: z.string().optional(),
});
