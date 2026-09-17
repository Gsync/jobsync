"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export type SegmentedToggleButtonProps = Readonly<
  {
    options?: readonly string[];
    defaultIndex?: number;
    onChange?: (index: number, value: string) => void;
  } & ComponentPropsWithoutRef<"div">
>;

const SEGMENT_MOTION =
  "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

const LABEL_MOTION =
  "transition-[color,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

function segmentGridClass(count: number): string {
  if (count <= 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  if (count === 4) return "grid-cols-4";
  return "grid-cols-5";
}

function indicatorWidthClass(count: number): string {
  // Subtract horizontal padding (0.5rem) plus inter-segment gaps (gap-1 each).
  if (count <= 2) return "w-[calc((100%-0.75rem)/2)]";
  if (count === 3) return "w-[calc((100%-1rem)/3)]";
  if (count === 4) return "w-[calc((100%-1.25rem)/4)]";
  return "w-[calc((100%-1.5rem)/5)]";
}

function indicatorOffsetClass(count: number, active: number): string {
  if (active <= 0) return "translate-x-0";

  const offsets: Record<number, Record<number, string>> = {
    2: { 1: "translate-x-[calc(100%+0.25rem)]" },
    3: {
      1: "translate-x-[calc(100%+0.25rem)]",
      2: "translate-x-[calc(200%+0.5rem)]",
    },
    4: {
      1: "translate-x-[calc(100%+0.25rem)]",
      2: "translate-x-[calc(200%+0.5rem)]",
      3: "translate-x-[calc(300%+0.75rem)]",
    },
    5: {
      1: "translate-x-[calc(100%+0.25rem)]",
      2: "translate-x-[calc(200%+0.5rem)]",
      3: "translate-x-[calc(300%+0.75rem)]",
      4: "translate-x-[calc(400%+1rem)]",
    },
  };

  const capped = Math.min(count, 5);
  return offsets[capped]?.[active] ?? "translate-x-0";
}

// Segmented toggle — iOS-style sliding pill with smooth eased motion.
export const SegmentedToggleButton = forwardRef<
  HTMLDivElement,
  SegmentedToggleButtonProps
>(
  (
    {
      className,
      options = ["Day", "Week", "Month"],
      defaultIndex = 0,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [active, setActive] = useState(defaultIndex);
    const count = options.length;
    const safeActive = Math.min(Math.max(active, 0), Math.max(count - 1, 0));

    const select = (index: number) => {
      setActive(index);
      onChange?.(index, options[index] ?? "");
    };

    return (
      <div
        ref={ref}
        role="tablist"
        data-slot="segmented-toggle-button"
        className={cn(
          "relative inline-grid w-fit gap-1 rounded-xl bg-neutral-100 p-1 font-sans text-sm font-medium select-none",
          "shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(0,0,0,0.05),inset_0_-2px_3px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.9)]",
          segmentGridClass(count),
          className,
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg bg-white",
            "shadow-[0_2px_4px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-2px_3px_rgba(0,0,0,0.06)]",
            SEGMENT_MOTION,
            indicatorWidthClass(count),
            indicatorOffsetClass(count, safeActive),
          )}
        />

        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={safeActive === index}
            tabIndex={safeActive === index ? 0 : -1}
            onClick={() => select(index)}
            className={cn(
              "relative z-10 min-w-18 cursor-pointer rounded-lg px-4 py-2 text-center whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900",
              LABEL_MOTION,
              safeActive === index
                ? "text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    );
  },
);

SegmentedToggleButton.displayName = "SegmentedToggleButton";
