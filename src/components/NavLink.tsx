import React, { ForwardRefExoticComponent, RefAttributes } from "react";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  label: string;
  Icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  route: string;
  pathname: string;
  expanded: boolean;
}

function NavLink({ label, Icon, route, pathname, expanded }: NavLinkProps) {
  // "/dashboard" is a prefix of every other route, so it only matches exactly.
  const isActive =
    pathname === route ||
    (route !== "/dashboard" && pathname.startsWith(`${route}/`));

  const link = (
    <Link
      href={route}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "navlink w-full hover:text-foreground",
        expanded ? "h-10 justify-start gap-3 px-4" : "h-12 justify-center",
        isActive ? "text-foreground" : "text-muted-foreground",
        isActive && expanded && "rounded-md bg-accent"
      )}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-0.5 bg-foreground"
        />
      )}
      <Icon className="h-6 w-6 shrink-0" strokeWidth={1.5} />
      {/* Collapsed uses sr-only, not opacity: an in-flow hidden span still
          takes flex space and pushes the icon off-center in the rail. */}
      {expanded ? (
        <span className="truncate text-sm">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </Link>
  );

  if (expanded) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export default NavLink;
