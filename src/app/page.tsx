import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db from "@/lib/db";
import LandingPage from "@/components/landing/LandingPage";

export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const userCount = await db.user.count();

  return <LandingPage hasUsers={userCount > 0} />;
}
