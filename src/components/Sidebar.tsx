"use client";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import { SIDEBAR_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  return (
    <section className="sidebar">
      <nav className="flex flex-col gap-4">
        <Link href="/" className="mb-12 flex cursor-pointer item-center gap-2">
          <Image
            src="/images/jobsync-logo.svg"
            width={32}
            height={32}
            alt="jobsync logo"
            className="size-08 max-xl:size-10"
          />
          <h1 className="sidebar-logo">JobSync</h1>
        </Link>
        {SIDEBAR_LINKS.map((item) => {
          const isActive = pathname === item.route;
          return (
            <Link
              href={item.route}
              key={item.label}
              className={cn("sidebar-link", { "bg-blue-400": isActive })}
            >
              <div className="relative size-6">
                <Image
                  src={item.imgURL}
                  alt={item.label}
                  fill
                  className={cn({ "brightness-[3] invert-0": isActive })}
                />
              </div>
              <p className={cn("sidebar-label", { "!text-white": isActive })}>
                {item.label}
              </p>
            </Link>
          );
        })}
        User
      </nav>
      Footer
    </section>
  );
}

export default Sidebar;
