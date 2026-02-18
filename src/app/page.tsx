import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db from "@/lib/db";

export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const userCount = await db.user.count();

  if (userCount === 0) {
    redirect("/signup");
  } else {
    redirect("/signin");
  }
}
