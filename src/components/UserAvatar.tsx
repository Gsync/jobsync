import { Button } from "./ui/button";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { SessionUser } from "@/models/user";

export default function UserAvatar({ user }: { user: SessionUser }) {
  // const { data: session, status } = useSession();
  // console.log("session user :", session?.user, status);
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
