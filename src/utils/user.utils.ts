import "server-only";
import { auth } from "@/auth";
import { CurrentUser } from "@/models/user.model";

export const getCurrentUser = async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user: CurrentUser = {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
  };
  return user;
};
