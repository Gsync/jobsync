import { User } from "lucide-react";
import { CurrentUser } from "@/models/user.model";
import { Avatar, AvatarFallback } from "./ui/avatar";

export default function UserAvatar({ user }: { user: CurrentUser | null }) {
  if (!user) return null;
  return (
    <Avatar className="h-9 w-9">
      <AvatarFallback className="bg-muted text-muted-foreground">
        <User className="h-5 w-5" />
      </AvatarFallback>
    </Avatar>
  );
}
