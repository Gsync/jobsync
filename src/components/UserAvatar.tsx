import Image from "next/image";
import { CurrentUser } from "@/models/user.model";
// import { useSession } from "next-auth/react";

export default function UserAvatar({ user }: { user: CurrentUser | null }) {
  // const { data: session, status } = useSession();
  if (!user) return null;
  return (
    <Image
      src="/images/placeholder-user.jpg"
      width={36}
      height={36}
      alt="Avatar"
      className="overflow-hidden rounded-full"
    />
  );
}
