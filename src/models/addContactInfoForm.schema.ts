import { z } from "zod";

export const AddContactInfoFormSchema = z.object({
  id: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  resumeId: z.string().optional(),
  firstName: z
    .string({
      error: "First Name is required.",
    })
    .min(2, {
      error: "First name must be at least 2 characters.",
    }),
  lastName: z
    .string({
      error: "Last Name is required.",
    })
    .min(2, {
      error: "Last name must be at least 2 characters.",
    }),
  headline: z
    .string({
      error: "Headline is required.",
    })
    .min(2, {
      error: "Headline must be at least 2 characters.",
    }),
  email: z
    .email({
      error: (issue) =>
        issue.code === "invalid_type" ? "Email is required!" : "Please enter a valid email!",
    }),
  phone: z.string({
    error: "Phone is required!",
  }),
  address: z.string().optional(),
  url1: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "URL must start with http:// or https://"),
  url1Label: z.string().optional(),
  url2: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "URL must start with http:// or https://"),
  url2Label: z.string().optional(),
});
