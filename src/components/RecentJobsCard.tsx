import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecentJobsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs Applied</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="hidden h-9 w-9 sm:flex">
            {/* <AvatarImage src="/avatars/01.png" alt="Avatar" /> */}
            <AvatarFallback>MS</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none">
              Full Stack Developer
            </p>
            <p className="text-sm text-muted-foreground">Microsoft</p>
          </div>
          <div className="ml-auto font-medium">+1,999</div>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="hidden h-9 w-9 sm:flex">
            {/* <AvatarImage src="/avatars/02.png" alt="Avatar" /> */}
            <AvatarFallback>FB</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none">
              Full Stack Developer
            </p>
            <p className="text-sm text-muted-foreground">Facebook</p>
          </div>
          <div className="ml-auto font-medium">+39</div>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="hidden h-9 w-9 sm:flex">
            {/* <AvatarImage src="/avatars/03.png" alt="Avatar" /> */}
            <AvatarFallback>AM</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none">
              Frontend Developer
            </p>
            <p className="text-sm text-muted-foreground">Amazon</p>
          </div>
          <div className="ml-auto font-medium">+299</div>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="hidden h-9 w-9 sm:flex">
            {/* <AvatarImage src="/avatars/04.png" alt="Avatar" /> */}
            <AvatarFallback>NF</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none">
              Frontend Developer
            </p>
            <p className="text-sm text-muted-foreground">Netflix</p>
          </div>
          <div className="ml-auto font-medium">+99</div>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="hidden h-9 w-9 sm:flex">
            {/* <AvatarImage src="/avatars/05.png" alt="Avatar" /> */}
            <AvatarFallback>SD</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none">
              Software Architect
            </p>
            <p className="text-sm text-muted-foreground">Oracle</p>
          </div>
          <div className="ml-auto font-medium">+39</div>
        </div>
      </CardContent>
    </Card>
  );
}
