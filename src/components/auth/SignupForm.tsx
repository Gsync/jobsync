"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignupForm as OsuiSignupForm } from "../osui/forms/signup-form";
import { signup, authenticate } from "@/actions/auth.actions";

// osui signup form, wired to the existing register + login actions.
function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setError] = useState("");
  const router = useRouter();

  return (
    <OsuiSignupForm
      title="Create your account"
      subtitle="Track every application in one place"
      submitLabel="Sign up"
      loginPrompt="Already have an account?"
      loginHref="/signin"
      loginLabel="Sign in"
      loading={isPending}
      submitErrorMessage={errorMessage || undefined}
      onSubmit={(values) => {
        startTransition(async () => {
          setError("");
          const result = await signup(values);
          if (result.error) {
            setError(result.error);
            return;
          }
          const formData = new FormData();
          formData.set("email", values.email);
          formData.set("password", values.password);
          const authError = await authenticate("", formData);
          if (authError) setError(authError);
          else router.push("/dashboard");
        });
      }}
    />
  );
}

export default SignupForm;
