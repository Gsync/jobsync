"use client";

import { I18nProvider } from "@lingui/react";
import { type I18n } from "@lingui/core";

interface LinguiClientProviderProps {
  i18n: I18n;
  children: React.ReactNode;
}

export function LinguiClientProvider({
  i18n,
  children,
}: LinguiClientProviderProps) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
