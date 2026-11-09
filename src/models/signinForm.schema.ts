import { z } from "zod";

export const SigninFormSchema = z.object({
  email: z
    .email({
      error: (issue) =>
        issue.code === "invalid_type" ? "Email is required." : "Please enter a valid email.",
    })
    .min(3, {
      error: "Email must be at least 3 characters.",
    }),
  password: z
    .string({
      error: "Please enter your password.",
    })
    .min(1),
});
