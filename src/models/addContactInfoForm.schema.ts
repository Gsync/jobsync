import { z } from "zod";

export const AddContactInfoFormSchema = z.object({
  id: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  resumeId: z.string().optional(),
  firstName: z
    .string({
      required_error: "First Name is required.",
    })
    .min(1),
  lastName: z
    .string({
      required_error: "Last Name is required.",
    })
    .min(1),
  headline: z
    .string({
      required_error: "Headline is required.",
    })
    .min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
