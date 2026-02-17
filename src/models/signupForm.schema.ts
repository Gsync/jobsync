import { z } from "zod";

export const SignupFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z
    .string({
      error: "Email is required.",
    })
    .min(3, {
      message: "Email must be at least 3 characters.",
    })
    .email("Please enter a valid email."),
  password: z
    .string({
      error: "Please enter your password.",
    })
    .min(6, {
      message: "Password must be at least 6 characters.",
    }),
});
