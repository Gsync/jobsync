"use client";

import { useRouter } from "next/navigation";
import SigninForm from "./SigninForm";
import SignupForm from "./SignupForm";
import { useTranslations } from "@/i18n";

type AuthMode = "signin" | "signup";

interface AuthCardProps {
  mode: AuthMode;
  locale?: string;
}

export default function AuthCard({ mode, locale }: AuthCardProps) {
  const router = useRouter();
  const { t } = useTranslations(locale);

  return (
    <div className="mx-auto w-full max-w-md px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">JobSync</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your job search, powered by AI
        </p>
      </div>

      <div className="mb-6 flex rounded-xl border bg-muted p-1">
        <button
          onClick={() => router.push("/signin")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
            mode === "signin"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("auth.signIn")}
        </button>
        <button
          onClick={() => router.push("/signup")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
            mode === "signup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("auth.createAccount")}
        </button>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {mode === "signin" ? (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-semibold">{t("auth.welcomeBack")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("auth.enterCredentials")}
              </p>
            </div>
            <SigninForm />
          </>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-semibold">{t("auth.getStarted")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("auth.createFreeAccount")}
              </p>
            </div>
            <SignupForm />
          </>
        )}
      </div>
    </div>
  );
}
