import { z } from "zod";

export const SigninFormSchema = z.object({
  email: z
    .string({
      required_error: "Email is required.",
    })
    .min(3, {
      message: "Email must be at least 3 characters.",
    })
    .email("Please enter a valid email."),
  password: z
    .string({
      required_error: "Please enter your password.",
    })
    .min(1),
});
