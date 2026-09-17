"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

type ContactField = Readonly<{
  label: string;
  value: string;
  href?: string;
}>;

export type ContactProfileCardProps = Readonly<
  {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    websiteHref?: string;
    catalogRef?: string;
  } & ComponentPropsWithoutRef<"article">
>;

function ContactFieldRow({ label, value, href }: ContactField) {
  const valueClassName =
    "text-right text-sm text-neutral-800 transition-colors group-hover:text-neutral-950";

  return (
    <div className="group grid grid-cols-[5.5rem_1fr] items-baseline gap-3 py-1.5">
      <span className="font-mono text-[9px] tracking-[0.18em] text-neutral-400 uppercase">
        {label}
      </span>
      {href && href !== "#" ? (
        <Link href={href} className={cn(valueClassName, "hover:underline")}>
          {value}
        </Link>
      ) : (
        <span className={valueClassName}>{value}</span>
      )}
    </div>
  );
}

// Contact profile — museum placard directory entry, typography only.
export const ContactProfileCard = forwardRef<
  HTMLElement,
  ContactProfileCardProps
>(
  (
    {
      className,
      name = "Bidyut Kundu",
      title = "Product engineer",
      email = "bidyut.kundu.dev@gmail.com",
      phone = "+91 98765 43210",
      location = "Kolkata, India",
      website = "opensourceui.in",
      websiteHref = "https://opensourceui.in",
      catalogRef = "DIR · CONTACT",
      ...props
    },
    ref,
  ) => (
    <article
      ref={ref}
      data-slot="contact-profile-card"
      className={cn(
        "w-80 rounded-sm border border-neutral-200 bg-[#faf8f5] px-5 py-4 font-sans shadow-sm",
        className,
      )}
      {...props}
    >
      <p className="font-mono text-[9px] tracking-[0.22em] text-neutral-400 uppercase">
        {catalogRef}
      </p>

      <h3 className="mt-3 font-serif text-xl leading-snug text-neutral-900">
        {name}
      </h3>
      <p className="mt-1 text-xs text-neutral-500">{title}</p>

      <div className="mt-4 space-y-0.5 border-t border-neutral-200 pt-3">
        <ContactFieldRow label="Email" value={email} href={`mailto:${email}`} />
        <ContactFieldRow
          label="Phone"
          value={phone}
          href={`tel:${phone.replace(/\s/g, "")}`}
        />
        <ContactFieldRow label="Location" value={location} />
        <ContactFieldRow label="Web" value={website} href={websiteHref} />
      </div>
    </article>
  ),
);

ContactProfileCard.displayName = "ContactProfileCard";
