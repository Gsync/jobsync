"use client";

import { useEffect } from "react";
import { useTranslations } from "@/i18n";
import { reportError, generateErrorId } from "@/lib/error-reporter";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslations();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      reportError({
        id: generateErrorId(),
        timestamp: new Date(),
        message: error.message,
        stack: error.stack,
        source: "error-boundary",
      });
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">{t("common.error")}</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          {t("settings.errorTryAgain")}
        </button>
      </div>
    </div>
  );
}
