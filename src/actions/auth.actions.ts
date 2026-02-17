"use server";
import { AuthError } from "next-auth";
import { signIn } from "../auth";
import { delay } from "@/utils/delay";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignupFormSchema } from "@/models/signupForm.schema";
import { JOB_SOURCES } from "@/lib/constants";

export async function signup(formData: {
  name: string;
  email: string;
  password: string;
}) {
  const parsed = SignupFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data." };
  }

  const { name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  await prisma.jobSource.createMany({
    data: JOB_SOURCES.map((source) => ({
      label: source.label,
      value: source.value,
      createdBy: newUser.id,
    })),
  });

  return { success: true };
}

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
