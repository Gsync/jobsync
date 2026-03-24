import { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import { getUserLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function Signin() {
  const locale = await getUserLocale();
  return <AuthCard mode="signin" locale={locale} />;
}
