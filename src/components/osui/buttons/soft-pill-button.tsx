"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type SoftPillButtonVariant = "light" | "dark";
export type SoftPillButtonSize = "sm" | "md" | "lg";

export type SoftPillButtonProps = Readonly<
  {
    children: ReactNode;
    variant?: SoftPillButtonVariant;
    size?: SoftPillButtonSize;
  } & ComponentPropsWithoutRef<"button">
>;

const SIZE: Record<SoftPillButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-full px-4 text-xs",
  md: "h-10 gap-2 rounded-full px-5 text-sm",
  lg: "h-12 gap-2 rounded-full px-6 text-sm",
};

const VARIANT: Record<SoftPillButtonVariant, string> = {
  light: cn(
    "bg-white text-neutral-800",
    "shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.08)]",
    "hover:bg-neutral-50 hover:text-neutral-900",
    "active:bg-neutral-100 active:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_3px_8px_rgba(0,0,0,0.06)]",
  ),
  dark: cn(
    "bg-neutral-800 text-white",
    "shadow-[0_2px_4px_rgba(0,0,0,0.2),0_8px_20px_rgba(0,0,0,0.25)]",
    "hover:bg-neutral-700",
    "active:bg-neutral-900 active:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.2)]",
  ),
};

// SoftPillButton — floating rounded pill; pass any children.
export const SoftPillButton = forwardRef<
  HTMLButtonElement,
  SoftPillButtonProps
>(
  (
    {
      className,
      children,
      variant = "light",
      size = "md",
      type = "button",
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        data-slot="soft-pill-button"
        data-variant={variant}
        data-size={size}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center font-sans font-semibold outline-none select-none",
          "transition-[background-color,box-shadow,color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          "active:translate-y-px motion-reduce:active:translate-y-0",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          SIZE[size],
          VARIANT[variant],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

SoftPillButton.displayName = "SoftPillButton";
