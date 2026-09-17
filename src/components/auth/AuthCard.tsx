"use client";

import { useRouter } from "next/navigation";
import SigninForm from "./SigninForm";
import SignupForm from "./SignupForm";
import { SegmentedToggleButton } from "../osui/buttons/segmented-toggle-button";

type AuthMode = "signin" | "signup";

interface AuthCardProps {
  mode: AuthMode;
}

// osui shell (segmented toggle) around the osui auth forms.
export default function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-md px-4 font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">JobSync</h1>
        <p className="mt-1 text-sm text-neutral-500">
          School + job applications, one tracker
        </p>
      </div>

      <div className="mb-6 flex justify-center">
        <SegmentedToggleButton
          key={mode}
          options={["Sign In", "Create Account"]}
          defaultIndex={mode === "signup" ? 1 : 0}
          // osui types onChange as an intersection with the div handler; the
          // (index, value) form is the documented usage.
          onChange={((_: number, value: string) =>
            router.push(value === "Create Account" ? "/signup" : "/signin")) as never}
        />
      </div>

      {mode === "signin" ? <SigninForm /> : <SignupForm />}
    </div>
  );
}
