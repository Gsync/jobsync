import Link from "next/link";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Briefcase, Settings } from "lucide-react";
import { SIDEBAR_LINKS } from "@/lib/constants";
import NavLink from "./NavLink";

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="#"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <Briefcase className="h-4 w-4 transition-all group-hover:scale-110" />
          <span className="sr-only">JobSync</span>
        </Link>
        <TooltipProvider delayDuration={200}>
          {SIDEBAR_LINKS.map((item) => {
            return (
              <NavLink
                key={item.label}
                label={item.label}
                Icon={item.icon}
                route="#"
              />
            );
          })}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <TooltipProvider>
          <NavLink label="Settings" Icon={Settings} route="#" />
        </TooltipProvider>
      </nav>
    </aside>
  );
}

export default Sidebar;

// ==============================================
// ==============================================
// "use client";
// import Link from "next/link";
// import React from "react";
// import Image from "next/image";
// import { SIDEBAR_LINKS } from "@/lib/constants";
// import { cn } from "@/lib/utils";
// import { usePathname } from "next/navigation";

// function Sidebar({ user }: SidebarProps) {
//   const pathname = usePathname();
//   return (
//     <section className="sidebar">
//       <nav className="flex flex-col gap-4">
//         <Link href="/" className="mb-12 flex cursor-pointer item-center gap-2">
//           <Image
//             src="/images/jobsync-logo.svg"
//             width={32}
//             height={32}
//             alt="jobsync logo"
//             className="size-08 max-xl:size-10"
//           />
//           <h1 className="sidebar-logo">JobSync</h1>
//         </Link>
//         {SIDEBAR_LINKS.map((item) => {
//           const isActive = pathname === item.route;
//           return (
//             <Link
//               href={item.route}
//               key={item.label}
//               className={cn("sidebar-link", { "bg-blue-400": isActive })}
//             >
//               <div className="relative size-6">
//                 <Image
//                   src={item.imgURL}
//                   alt={item.label}
//                   fill
//                   className={cn({ "brightness-[3] invert-0": isActive })}
//                 />
//               </div>
//               <p className={cn("sidebar-label", { "!text-white": isActive })}>
//                 {item.label}
//               </p>
//             </Link>
//           );
//         })}
//         User
//       </nav>
//       Footer
//     </section>
//   );
// }

// export default Sidebar;
