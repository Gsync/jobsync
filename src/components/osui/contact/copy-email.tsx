"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CopyEmailProps = Readonly<{
  email?: string;
  className?: string;
  /** Visible label. Defaults to the email address. */
  children?: string;
}>;

/**
 * Copies the maintainer email on click — no mailto / mailbox popup.
 * Hover shows “Click to copy”; after click shows “Copied”.
 */
export function CopyEmail({
  email = "",
  className,
  children,
}: CopyEmailProps) {
  const tipId = useId();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const field = document.createElement("textarea");
      field.value = email;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      document.body.removeChild(field);
    }

    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1600);
  }, [email]);

  const showTip = hovered || copied;
  const tipLabel = copied ? "Copied" : "Click to copy";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={copy}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-describedby={showTip ? tipId : undefined}
        aria-label={copied ? `Copied ${email}` : `Copy ${email}`}
        className={cn(
          "cursor-pointer font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 transition-colors hover:decoration-neutral-500",
          className,
        )}
      >
        {children ?? "Email"}
      </button>

      <span
        id={tipId}
        role="tooltip"
        className={cn(
          "ease-smooth pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 rounded-md bg-neutral-900 px-2 py-1 font-sans text-[11px] font-medium whitespace-nowrap text-white shadow-sm transition-[opacity,transform] duration-150",
          showTip
            ? "translate-y-0 opacity-100"
            : "translate-y-0.5 opacity-0 motion-reduce:translate-y-0",
        )}
      >
        {tipLabel}
        <span
          aria-hidden
          className="absolute top-full left-1/2 -mt-px -translate-x-1/2 border-4 border-transparent border-t-neutral-900"
        />
      </span>
    </span>
  );
}
