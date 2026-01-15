import { z } from "zod";

export const AddTaskFormSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  title: z
    .string({ required_error: "Title is required." })
    .min(2, { message: "Title must be at least 2 characters." }),
  description: z
    .string()
    .max(2000, { message: "Description cannot exceed 2000 characters." })
    .optional()
    .nullable(),
  status: z.enum(["in-progress", "complete", "needs-attention", "cancelled"]),
  priority: z.number().min(0).max(10),
  percentComplete: z.number().min(0).max(100),
  dueDate: z
    .date()
    .optional()
    .nullable()
    .refine(
      (date) => {
        if (!date) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      },
      { message: "Due date cannot be in the past." }
    ),
  activityTypeId: z.string().optional().nullable(),
});
