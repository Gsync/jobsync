import { z } from "zod";

export const CreateResumeFormSchema = z.object({
  id: z.string().optional(),
  createdBy: z.string().optional(),
  title: z
    .string({
      required_error: "Resume title is required.",
    })
    .min(1),
  profileId: z.string().optional(),
});
