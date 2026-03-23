import Link from "next/link";
import { PanelLeft, Briefcase } from "lucide-react";

import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SIDEBAR_LINKS } from "@/lib/constants";
import { signOut } from "@/auth";
import { getCurrentUser } from "@/utils/user.utils";
import { ProfileDropdown } from "./ProfileDropdown";
import { t, getUserLocale } from "@/i18n/server";

async function Header() {
  const user = await getCurrentUser();
  const locale = await getUserLocale();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">{t(locale, "nav.toggleMenu")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetTitle className="sr-only">{t(locale, "nav.toggleMenu")}</SheetTitle>
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
              if (item.devOnly && process.env.NODE_ENV !== "development") {
                return null;
              }
              return (
                <SheetClose asChild key={item.labelKey}>
                  <Link
                    href={item.route}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    {t(locale, item.labelKey)}
                  </Link>
                </SheetClose>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <h1 className="font-semibold">{t(locale, "nav.appTitle")}</h1>
      <div className="relative ml-auto flex-1 md:grow-0" />

      <ProfileDropdown
        user={user}
        signOutAction={async () => {
          "use server";
          await signOut();
        }}
      />
    </header>
  );
}

export default Header;
