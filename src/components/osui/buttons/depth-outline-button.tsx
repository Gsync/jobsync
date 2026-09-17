"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type DepthOutlineButtonSize = "sm" | "md" | "lg";

export type DepthOutlineButtonProps = Readonly<
  {
    children: ReactNode;
    size?: DepthOutlineButtonSize;
  } & ComponentPropsWithoutRef<"button">
>;

const SIZE: Record<DepthOutlineButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3.5 text-xs tracking-wide",
  md: "h-10 gap-2 rounded-xl px-4 text-sm tracking-wide",
  lg: "h-12 gap-2 rounded-xl px-5 text-sm tracking-wide",
};

// Resting: dual-edge (hairline + float) with a soft top lip — not a flat border.
const REST =
  "shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.04),0_4px_10px_rgba(0,0,0,0.05),0_12px_28px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.75),inset_0_-1px_2px_rgba(0,0,0,0.04)]";

const HOVER =
  "hover:bg-neutral-50 hover:text-neutral-950 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.05),0_8px_16px_rgba(0,0,0,0.07),0_20px_40px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-1px_2px_rgba(0,0,0,0.05)]";

const PRESSED =
  "active:bg-neutral-100 active:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]";

// DepthOutlineButton — premium outlined CTA with layered float depth; pass any children.
export const DepthOutlineButton = forwardRef<
  HTMLButtonElement,
  DepthOutlineButtonProps
>(
  (
    { className, children, size = "md", type = "button", disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        data-slot="depth-outline-button"
        data-size={size}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center bg-white font-sans font-semibold text-neutral-800 outline-none select-none",
          "transition-[background-color,box-shadow,color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          "active:translate-y-px motion-reduce:active:translate-y-0",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          REST,
          HOVER,
          PRESSED,
          SIZE[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

DepthOutlineButton.displayName = "DepthOutlineButton";
