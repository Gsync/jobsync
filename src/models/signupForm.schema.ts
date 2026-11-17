import { z } from "zod";

export const SignupFormSchema = z.object({
  name: z.string().min(2, {
    error: "Name must be at least 2 characters.",
  }),
  email: z
    .email({
      error: (issue) =>
        issue.code === "invalid_type" ? "Email is required." : "Please enter a valid email.",
    }),
  password: z
    .string({
      error: "Please enter your password.",
    })
    .min(6, {
      error: "Password must be at least 6 characters.",
    }),
});
