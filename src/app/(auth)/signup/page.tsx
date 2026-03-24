import { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import { getUserLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default async function Signup() {
  const locale = await getUserLocale();
  return <AuthCard mode="signup" locale={locale} />;
}
