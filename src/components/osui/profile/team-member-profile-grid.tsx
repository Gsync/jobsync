"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

export type TeamMemberProfile = Readonly<{
  id?: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  imageAlt?: string;
  profileHref?: string;
}>;

export type TeamMemberProfileGridProps = Readonly<
  {
    title?: string;
    subtitle?: string;
    members?: readonly TeamMemberProfile[];
    profileLabel?: string;
  } & ComponentPropsWithoutRef<"section">
>;

const DEFAULT_MEMBERS: readonly TeamMemberProfile[] = [
  {
    id: "bidyut-kundu",
    name: "Bidyut Kundu",
    role: "Founder & engineer",
    bio: "Building open-source UI for developers who care about craft, speed, and copy-paste simplicity.",
    image: "/profile-picture.png",
    profileHref: "#",
  },
  {
    id: "team-placeholder-1",
    name: "Team member",
    role: "Role",
    bio: "Add your next hire here when the team grows.",
    image: "/profile-picture.png",
    profileHref: "#",
  },
  {
    id: "team-placeholder-2",
    name: "Team member",
    role: "Role",
    bio: "Swap this placeholder with a real profile.",
    image: "/profile-picture.png",
    profileHref: "#",
  },
];

function MemberProfileLink({
  href,
  label,
  className,
}: Readonly<{
  href: string;
  label: string;
  className?: string;
}>) {
  const linkClassName = cn(
    "text-xs font-medium text-neutral-900 underline-offset-4 transition-colors hover:underline",
    className,
  );

  if (!href || href === "#") {
    return (
      <button type="button" className={linkClassName}>
        {label}
      </button>
    );
  }

  return (
    <Link href={href} className={linkClassName}>
      {label}
    </Link>
  );
}

// Team member profile grid — equal-height cards with compact portraits for about pages.
export const TeamMemberProfileGrid = forwardRef<
  HTMLElement,
  TeamMemberProfileGridProps
>(
  (
    {
      className,
      title = "The team",
      subtitle = "People behind the product",
      members = DEFAULT_MEMBERS,
      profileLabel = "View profile",
      ...props
    },
    ref,
  ) => (
    <section
      ref={ref}
      data-slot="team-member-profile-grid"
      className={cn("w-full max-w-4xl font-sans", className)}
      {...props}
    >
      <header className="mb-8 border-b border-neutral-200 pb-4">
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase">
          {subtitle}
        </p>
        <h2 className="mt-2 font-serif text-3xl leading-none tracking-tight text-neutral-950">
          {title}
        </h2>
      </header>

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {members.map((member, index) => {
          const alt = member.imageAlt ?? member.name;
          const key = member.id ?? `${member.name}-${index}`;

          return (
            <li key={key} className="min-w-0">
              <article className="flex h-full flex-col border border-neutral-200 bg-white p-5">
                <div className="size-16 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.image}
                    alt={alt}
                    className="size-full object-cover"
                  />
                </div>

                <h3 className="mt-4 font-serif text-xl leading-none tracking-tight text-neutral-950">
                  {member.name}
                </h3>
                <p className="mt-2 text-[10px] font-semibold tracking-[0.16em] text-neutral-500 uppercase">
                  {member.role}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-neutral-600">
                  {member.bio}
                </p>

                {member.profileHref ? (
                  <div className="mt-auto border-t border-neutral-100 pt-4">
                    <MemberProfileLink
                      href={member.profileHref}
                      label={profileLabel}
                    />
                  </div>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  ),
);

TeamMemberProfileGrid.displayName = "TeamMemberProfileGrid";
