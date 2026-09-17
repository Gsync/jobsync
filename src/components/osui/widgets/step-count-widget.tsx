"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export type StepCountWidgetProps = Readonly<
  {
    steps?: number;
    goal?: number;
    label?: string;
  } & ComponentPropsWithoutRef<"div">
>;

// Daily steps — editorial stat card, typography-led.
export const StepCountWidget = forwardRef<HTMLDivElement, StepCountWidgetProps>(
  (
    { className, steps = 8432, goal = 10_000, label = "steps today", ...props },
    ref,
  ) => {
    const progress = Math.min(100, Math.round((steps / goal) * 100));

    return (
      <div
        ref={ref}
        data-slot="step-count-widget"
        className={cn(
          "w-64 rounded-3xl border border-neutral-200/80 bg-white p-6 font-sans shadow-lg shadow-black/5 select-none",
          className,
        )}
        {...props}
      >
        <p className="text-[11px] text-neutral-400">Today</p>

        <p className="mt-4 text-5xl leading-none font-light tracking-tight text-neutral-900 tabular-nums">
          {steps.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-neutral-500">{label}</p>

        <div className="mt-8 flex items-center justify-between border-t border-neutral-100 pt-4">
          <span className="text-xs text-neutral-400">
            Goal {goal.toLocaleString()}
          </span>
          <span className="text-xs font-medium text-neutral-700 tabular-nums">
            {progress}%
          </span>
        </div>
      </div>
    );
  },
);

StepCountWidget.displayName = "StepCountWidget";
