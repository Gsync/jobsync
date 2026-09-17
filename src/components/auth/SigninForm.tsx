"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "../osui/forms/login-form";
import { authenticate } from "@/actions/auth.actions";

// osui login form, wired to the existing credentials action.
function SigninForm() {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setError] = useState("");
  const router = useRouter();

  return (
    <LoginForm
      title="Welcome back"
      subtitle="Sign in to your application tracker"
      submitLabel="Login"
      signupPrompt="New here?"
      signupHref="/signup"
      signupLabel="Create an account"
      forgotPasswordHref="/signin"
      loading={isPending}
      submitErrorMessage={errorMessage || undefined}
      onSubmit={(values) => {
        startTransition(async () => {
          setError("");
          const formData = new FormData();
          formData.set("email", values.email);
          formData.set("password", values.password);
          const errorResponse = await authenticate("", formData);
          if (errorResponse) setError(errorResponse);
          else router.push("/dashboard");
        });
      }}
    />
  );
}

export default SigninForm;
