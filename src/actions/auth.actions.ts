"use server";
import { AuthError } from "next-auth";
import { signIn } from "../auth";
import { delay } from "@/utils/delay";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await delay(1000);
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}
