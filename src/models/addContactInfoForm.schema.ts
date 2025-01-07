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
    .min(2, {
      message: "First name must be at least 2 characters.",
    }),
  lastName: z
    .string({
      required_error: "Last Name is required.",
    })
    .min(2, {
      message: "Last name must be at least 2 characters.",
    }),
  headline: z
    .string({
      required_error: "Headline is required.",
    })
    .min(2, {
      message: "Headline must be at least 2 characters.",
    }),
  email: z
    .string({
      required_error: "Email is required!",
    })
    .email("Please enter a valid email!"),
  phone: z.string({
    required_error: "Phone is required!",
  }),
  address: z.string().optional(),
});
