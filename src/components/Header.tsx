import Link from "next/link";
import {
  PanelLeft,
  Briefcase,
  Search,
  PowerIcon,
  Settings,
  Info,
} from "lucide-react";

import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SIDEBAR_LINKS } from "@/lib/constants";
import { signOut } from "@/auth";
import UserAvatar from "./UserAvatar";
import { getCurrentUser } from "@/utils/user.utils";
import { redirect } from "next/navigation";

async function Header() {
  // const session = await auth();
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <SheetClose asChild>
              <Link
                href="/"
                className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
              >
                <Briefcase className="h-5 w-5 transition-all group-hover:scale-110" />
                <span className="sr-only">JobSync</span>
              </Link>
            </SheetClose>
            {SIDEBAR_LINKS.map((item) => {
              return (
                <SheetClose asChild key={item.label}>
                  <Link
                    href={item.route}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </SheetClose>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <h1 className="font-semibold">JobSync - Job Search Assistant</h1>
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="search"
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        /> */}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <UserAvatar user={user} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Settings className="w-5 mr-2" />
            <Link href="/dashboard/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Info className="w-5 mr-2" />
            Support
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <DropdownMenuItem>
              <Button variant="ghost" className="w-full">
                <PowerIcon className="w-5" />
                <div className="hidden md:block mx-2">Logout</div>
              </Button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export default Header;
