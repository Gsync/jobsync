import "server-only";
import { auth } from "@/auth";
import { CurrentUser } from "@/models/user.model";

export const getCurrentUser = async () => {
  const session = await auth();
  if (!session?.accessToken) return null;
  const { sub, name, email, iat, exp } = session?.accessToken;
  const user: CurrentUser = {
    id: sub,
    name,
    email,
    iat,
    exp,
  };
  return user;
};
